import requests
from datetime import datetime, timezone
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from scm.db import get_col, serialize, serialize_list, to_id


def get_uid(request):
    return str(request.auth.get('user_id',''))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def prediction_list(request):
    uid  = get_uid(request)
    preds = list(get_col('predictions').find({'user_id':uid}).sort('recommended_resupply_date',1))
    # attach material info
    mat_col = get_col('materials')
    for p in preds:
        mat = mat_col.find_one({'_id':to_id(p.get('material_id',''))})
        if mat:
            p['material_name']          = mat.get('name','')
            p['material_unit']          = mat.get('unit','')
            p['material_current_stock'] = mat.get('current_stock',0)
    return Response({'success':True,'data':serialize_list(preds)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_prediction(request, material_id):
    uid = get_uid(request)
    mat = get_col('materials').find_one({'_id':to_id(material_id),'user_id':uid})
    if not mat:
        return Response({'success':False,'message':'Material not found'},status=404)

    usage_qs = list(get_col('usage_entries').find(
        {'user_id':uid,'material_id':material_id}
    ).sort('date',1))

    if len(usage_qs) < 3:
        return Response({'success':False,'message':'Need at least 3 usage data points'},status=400)

    ml_payload = {
        'material_id':    material_id,
        'material_name':  mat['name'],
        'current_stock':  mat.get('current_stock',0),
        'lead_time_days': mat.get('lead_time_days',7),
        'forecast_days':  90,
        'use_ensemble':   True,
        'usage_data':     [{'date':u['date'],'quantity':u['quantity']} for u in usage_qs],
    }

    ml_result = None
    try:
        resp = requests.post(f"{settings.ML_SERVICE_URL}/predict", json=ml_payload, timeout=120)
        resp.raise_for_status()
        ml_result = resp.json()
    except Exception as exc:
        ml_result = _simple_fallback(mat, usage_qs)

    # Delete old prediction
    get_col('predictions').delete_many({'user_id':uid,'material_id':material_id})

    doc = {
        'user_id':                   uid,
        'material_id':               material_id,
        'material_name':             mat['name'],
        'predicted_daily_usage':     ml_result.get('predicted_daily_usage',0),
        'estimated_stockout_date':   ml_result.get('stockout_date'),
        'recommended_resupply_date': ml_result.get('resupply_date'),
        'recommended_order_quantity':ml_result.get('recommended_order_quantity'),
        'confidence':                ml_result.get('confidence'),
        'trend':                     ml_result.get('trend','stable'),
        'best_model':                ml_result.get('best_model',''),
        'used_ensemble':             ml_result.get('used_ensemble',False),
        'ensemble_top_n':            ml_result.get('ensemble_top_n',1),
        'data_points':               ml_result.get('data_points',len(usage_qs)),
        'model_used':                ml_result.get('model_used','pipeline'),
        'models_compared':           ml_result.get('models_compared',[]),
        'forecast_data':             ml_result.get('forecast_data',[]),
        'generated_at':              datetime.now(timezone.utc),
    }
    res   = get_col('predictions').insert_one(doc)
    doc['_id'] = res.inserted_id

    # Update material
    upd = {}
    if doc.get('recommended_resupply_date'): upd['next_resupply_date']    = doc['recommended_resupply_date']
    if doc.get('confidence'):                upd['prediction_confidence'] = doc['confidence']
    if upd: get_col('materials').update_one({'_id':to_id(material_id)},{'$set':upd})

    # Auto calendar event
    if doc.get('recommended_resupply_date'):
        conf_pct   = round((doc.get('confidence') or 0)*100)
        best_model = doc.get('best_model','')
        cal_col    = get_col('calendar_events')
        cal_col.update_one(
            {'user_id':uid,'material_id':material_id,'is_auto_generated':True,'type':'resupply'},
            {'$set':{
                'user_id':uid,'material_id':material_id,
                'title':f"Resupply: {mat['name']}",
                'description':f"{best_model} · Confidence {conf_pct}%",
                'date':doc['recommended_resupply_date'],
                'type':'resupply','priority':'high','color':'#D97706',
                'is_auto_generated':True,'is_completed':False,
                'created_at':datetime.now(timezone.utc),
            }},
            upsert=True
        )

    return Response({'success':True,'data':serialize(doc)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def comparison_detail(request, material_id):
    uid  = get_uid(request)
    pred = get_col('predictions').find_one({'user_id':uid,'material_id':material_id})
    if not pred:
        return Response({'success':False,'message':'No prediction found'},status=404)
    return Response({'success':True,'data':pred.get('models_compared',[])})


def _simple_fallback(mat, usage_list):
    from datetime import date, timedelta
    values = [u['quantity'] for u in usage_list[-30:]]
    avg    = sum(values)/len(values) if values else 1
    days   = int(mat.get('current_stock',0)/avg) if avg > 0 else 999
    stockout = date.today() + timedelta(days=days)
    resupply = stockout - timedelta(days=mat.get('lead_time_days',7))
    if resupply < date.today():
        resupply = date.today() + timedelta(days=1)
    return {
        'best_model':'linear_baseline','used_ensemble':False,'ensemble_top_n':1,
        'models_compared':[],'data_points':len(usage_list),'trend':'stable',
        'predicted_daily_usage':round(avg,2),
        'stockout_date':str(stockout),'resupply_date':str(resupply),
        'recommended_order_quantity':round(avg*37,2),
        'confidence':0.5,'model_used':'linear_baseline','forecast_data':[],
    }
