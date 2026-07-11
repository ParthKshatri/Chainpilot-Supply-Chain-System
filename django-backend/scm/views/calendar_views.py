from datetime import datetime, timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from scm.db import get_col, serialize, serialize_list, to_id


def get_uid(request):
    return str(request.auth.get('user_id',''))


@api_view(['GET','POST'])
@permission_classes([IsAuthenticated])
def event_list(request):
    uid = get_uid(request)
    col = get_col('calendar_events')

    if request.method == 'GET':
        query = {'user_id':uid}
        year  = request.query_params.get('year')
        month = request.query_params.get('month')
        if year and month:
            prefix = f"{int(year):04d}-{int(month):02d}"
            query['date'] = {'$regex':f'^{prefix}'}
        elif request.query_params.get('startDate') and request.query_params.get('endDate'):
            query['date'] = {'$gte':request.query_params['startDate'],'$lte':request.query_params['endDate']}

        events = list(col.find(query).sort('date',1))
        # attach material name
        mat_col = get_col('materials')
        for e in events:
            if e.get('material_id'):
                mat = mat_col.find_one({'_id':to_id(e['material_id'])})
                e['material_name'] = mat['name'] if mat else None
        return Response({'success':True,'data':serialize_list(events)})

    # POST
    data = request.data
    if not data.get('title'):
        return Response({'success':False,'message':'Title required'},status=400)

    doc = {
        'user_id':          uid,
        'title':            data.get('title',''),
        'description':      data.get('description',''),
        'date':             data.get('date',''),
        'end_date':         data.get('endDate') or data.get('end_date') or None,
        'type':             data.get('type','custom'),
        'priority':         data.get('priority','medium'),
        'color':            data.get('color','#7C6AF7'),
        'material_id':      data.get('materialId') or data.get('material_id') or None,
        'is_auto_generated':False,
        'is_completed':     False,
        'created_at':       datetime.now(timezone.utc),
    }
    res = col.insert_one(doc)
    doc['_id'] = res.inserted_id
    return Response({'success':True,'data':serialize(doc)},status=201)


@api_view(['GET','PUT','DELETE'])
@permission_classes([IsAuthenticated])
def event_detail(request, pk):
    uid = get_uid(request)
    col = get_col('calendar_events')
    event = col.find_one({'_id':to_id(pk),'user_id':uid})
    if not event:
        return Response({'success':False,'message':'Not found'},status=404)

    if request.method == 'GET':
        return Response({'success':True,'data':serialize(event)})

    if request.method == 'PUT':
        data = request.data
        upd  = {}
        for f in ['title','description','date','type','priority','color','is_completed']:
            if f in data: upd[f] = data[f]
        if 'endDate'    in data: upd['end_date']    = data['endDate']
        if 'materialId' in data: upd['material_id'] = data['materialId']
        col.update_one({'_id':to_id(pk)},{'$set':upd})
        event = col.find_one({'_id':to_id(pk)})
        return Response({'success':True,'data':serialize(event)})

    col.delete_one({'_id':to_id(pk)})
    return Response({'success':True,'message':'Deleted'})
