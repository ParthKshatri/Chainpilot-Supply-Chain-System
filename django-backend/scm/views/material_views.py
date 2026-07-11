from datetime import datetime, timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from scm.db import get_col, serialize, serialize_list, to_id


def get_uid(request):
    return str(request.auth.get('user_id', ''))


def _enrich(mat):
    """Add computed fields to a material document."""
    cap = mat.get('total_storage_capacity', 0) or 0
    cur = mat.get('current_stock', 0) or 0
    daily = mat.get('daily_usage', 0) or 0
    mat['stock_percentage']    = round((cur / cap) * 100, 1) if cap > 0 else 0
    mat['days_until_stockout'] = int(cur / daily) if daily > 0 else None
    return mat


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def material_list(request):
    uid = get_uid(request)
    col = get_col('materials')

    if request.method == 'GET':
        materials = list(col.find({'user_id': uid, 'is_active': True}).sort('name', 1))
        return Response({'success': True, 'data': serialize_list([_enrich(m) for m in materials])})

    data = request.data
    if not data.get('name'):
        return Response({'success': False, 'message': 'Name required'}, status=400)

    doc = {
        'user_id':                uid,
        'name':                   data.get('name', ''),
        'description':            data.get('description', ''),
        'unit':                   data.get('unit', 'units'),
        'category':               data.get('category', ''),
        'supplier':               data.get('supplier', ''),
        'lead_time_days':         int(data.get('lead_time_days', 7)),
        'current_stock':          float(data.get('current_stock', 0)),
        'total_storage_capacity': float(data.get('total_storage_capacity', 0)),
        'daily_usage':            float(data.get('daily_usage', 0)),
        'unit_cost':              float(data.get('unit_cost', 0)),
        'is_active':              True,
        'created_at':             datetime.now(timezone.utc),
        'updated_at':             datetime.now(timezone.utc),
    }
    res = col.insert_one(doc)
    doc['_id'] = res.inserted_id
    return Response({'success': True, 'data': serialize(_enrich(doc))}, status=201)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def material_detail(request, pk):
    uid = get_uid(request)
    col = get_col('materials')
    mat = col.find_one({'_id': to_id(pk), 'user_id': uid})
    if not mat:
        return Response({'success': False, 'message': 'Not found'}, status=404)

    if request.method == 'GET':
        return Response({'success': True, 'data': serialize(_enrich(mat))})

    if request.method == 'PUT':
        upd = {'updated_at': datetime.now(timezone.utc)}
        for f in ['name', 'description', 'unit', 'category', 'supplier',
                  'lead_time_days', 'current_stock', 'total_storage_capacity',
                  'daily_usage', 'unit_cost']:
            if f in request.data:
                upd[f] = request.data[f]
        col.update_one({'_id': to_id(pk)}, {'$set': upd})
        mat = col.find_one({'_id': to_id(pk)})
        return Response({'success': True, 'data': serialize(_enrich(mat))})

    col.update_one({'_id': to_id(pk)}, {'$set': {'is_active': False}})
    return Response({'success': True, 'message': 'Deleted'})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_stock(request, pk):
    uid = get_uid(request)
    col = get_col('materials')
    mat = col.find_one({'_id': to_id(pk), 'user_id': uid})
    if not mat:
        return Response({'success': False, 'message': 'Not found'}, status=404)

    upd = {'updated_at': datetime.now(timezone.utc)}

    # Accept both camelCase (from frontend) and snake_case
    field_map = {
        'currentStock':          'current_stock',
        'totalStorageCapacity':  'total_storage_capacity',
        'dailyUsage':            'daily_usage',
        'current_stock':         'current_stock',
        'total_storage_capacity':'total_storage_capacity',
        'daily_usage':           'daily_usage',
    }

    for frontend_key, db_key in field_map.items():
        if frontend_key in request.data:
            try:
                upd[db_key] = float(request.data[frontend_key])
            except (ValueError, TypeError):
                pass

    col.update_one({'_id': to_id(pk)}, {'$set': upd})
    mat = col.find_one({'_id': to_id(pk)})
    return Response({'success': True, 'data': serialize(_enrich(mat))})
