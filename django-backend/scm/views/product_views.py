from datetime import datetime, timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from bson import ObjectId
from scm.db import get_col, serialize, serialize_list, to_id


def get_uid(request):
    return str(request.auth.get('user_id',''))


@api_view(['GET','POST'])
@permission_classes([IsAuthenticated])
def product_list(request):
    uid = get_uid(request)
    col = get_col('products')

    if request.method == 'GET':
        products = list(col.find({'user_id':uid,'is_active':True}).sort('_id',-1))
        return Response({'success':True,'data':serialize_list(products)})

    data = request.data
    if not data.get('name'):
        return Response({'success':False,'message':'Name required'},status=400)

    doc = {
        'user_id':          uid,
        'name':             data.get('name',''),
        'description':      data.get('description',''),
        'sku':              data.get('sku',''),
        'category':         data.get('category',''),
        'production_cycle': data.get('productionCycle','monthly'),
        'materials':        data.get('materials',[]),
        'is_active':        True,
        'created_at':       datetime.now(timezone.utc),
        'updated_at':       datetime.now(timezone.utc),
    }
    res = col.insert_one(doc)
    doc['_id'] = res.inserted_id

    # Auto-create materials in inventory
    mat_col = get_col('materials')
    for mat in doc['materials']:
        name = mat.get('materialName','')
        if name and not mat_col.find_one({'user_id':uid,'name':{'$regex':f'^{name}$','$options':'i'},'is_active':True}):
            mat_col.insert_one({
                'user_id':uid,'name':name,'unit':mat.get('unit','units'),
                'description':'','category':'','supplier':'',
                'lead_time_days':7,'current_stock':0,'total_storage_capacity':0,
                'daily_usage':0,'unit_cost':0,'is_active':True,
                'created_at':datetime.now(timezone.utc),'updated_at':datetime.now(timezone.utc),
            })

    return Response({'success':True,'data':serialize(doc)},status=201)


@api_view(['GET','PUT','DELETE'])
@permission_classes([IsAuthenticated])
def product_detail(request, pk):
    uid = get_uid(request)
    col = get_col('products')
    product = col.find_one({'_id':to_id(pk),'user_id':uid})
    if not product:
        return Response({'success':False,'message':'Not found'},status=404)

    if request.method == 'GET':
        return Response({'success':True,'data':serialize(product)})

    if request.method == 'PUT':
        data = request.data
        upd  = {'updated_at':datetime.now(timezone.utc)}
        for field in ['name','description','sku','category']:
            if field in data: upd[field] = data[field]
        if 'productionCycle' in data: upd['production_cycle'] = data['productionCycle']
        if 'materials'       in data: upd['materials']        = data['materials']
        col.update_one({'_id':to_id(pk)},{'$set':upd})
        product = col.find_one({'_id':to_id(pk)})
        return Response({'success':True,'data':serialize(product)})

    col.update_one({'_id':to_id(pk)},{'$set':{'is_active':False}})
    return Response({'success':True,'message':'Deleted'})
