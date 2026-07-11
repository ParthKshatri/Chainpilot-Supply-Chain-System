import csv, io, re
from datetime import datetime, timezone, timedelta
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from scm.db import get_col, serialize, serialize_list, to_id


def get_uid(request):
    return str(request.auth.get('user_id', ''))


def _update_avg(uid, material_id):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).strftime('%Y-%m-%d')
    entries = list(get_col('usage_entries').find({
        'user_id': uid,
        'material_id': str(material_id),
        'date': {'$gte': cutoff}
    }))
    if entries:
        avg = sum(e['quantity'] for e in entries) / len(entries)
        get_col('materials').update_one(
            {'_id': to_id(material_id)},
            {'$set': {'daily_usage': round(avg, 2)}}
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def usage_list(request, material_id):
    uid = get_uid(request)
    entries = list(
        get_col('usage_entries')
        .find({'user_id': uid, 'material_id': str(material_id)})
        .sort('date', -1)
        .limit(365)
    )
    return Response({'success': True, 'data': serialize_list(entries)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def log_usage(request):
    uid = get_uid(request)

    # Accept both camelCase and snake_case
    material_id = str(
        request.data.get('materialId') or
        request.data.get('material_id') or
        request.data.get('material') or ''
    )
    date_val  = request.data.get('date', '')
    quantity  = request.data.get('quantity', 0)
    notes     = request.data.get('notes', '')

    if not material_id:
        return Response({'success': False, 'message': 'materialId is required'}, status=400)
    if not date_val:
        return Response({'success': False, 'message': 'date is required'}, status=400)

    try:
        quantity = float(quantity)
    except (ValueError, TypeError):
        return Response({'success': False, 'message': 'quantity must be a number'}, status=400)

    mat = get_col('materials').find_one({'_id': to_id(material_id), 'user_id': uid})
    if not mat:
        return Response({'success': False, 'message': 'Material not found'}, status=404)

    col   = get_col('usage_entries')
    existing = col.find_one({'user_id': uid, 'material_id': material_id, 'date': date_val})

    if existing:
        col.update_one(
            {'_id': existing['_id']},
            {'$set': {'quantity': quantity, 'notes': notes, 'source': 'manual'}}
        )
        entry = col.find_one({'_id': existing['_id']})
    else:
        doc = {
            'user_id':     uid,
            'material_id': material_id,
            'date':        date_val,
            'quantity':    quantity,
            'notes':       notes,
            'source':      'manual',
            'created_at':  datetime.now(timezone.utc),
        }
        res   = col.insert_one(doc)
        entry = col.find_one({'_id': res.inserted_id})

    _update_avg(uid, material_id)
    return Response({'success': True, 'data': serialize(entry)}, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_usage(request, material_id):
    uid = get_uid(request)
    mat = get_col('materials').find_one({'_id': to_id(material_id), 'user_id': uid})
    if not mat:
        return Response({'success': False, 'message': 'Material not found'}, status=404)

    file = request.FILES.get('file')
    if not file:
        return Response({'success': False, 'message': 'No file provided'}, status=400)

    filename = file.name.lower()
    content  = file.read().decode('utf-8', errors='ignore')

    if filename.endswith('.csv'):
        parsed = _parse_csv(content)
    elif filename.endswith('.xml'):
        parsed = _parse_xml(content)
    else:
        return Response({'success': False, 'message': 'Only CSV and XML files allowed'}, status=400)

    if not parsed:
        return Response({'success': False, 'message': 'No valid data found in file'}, status=400)

    source = 'csv_upload' if filename.endswith('.csv') else 'xml_upload'
    col    = get_col('usage_entries')

    # Delete old uploaded entries for this material
    col.delete_many({
        'user_id':     uid,
        'material_id': str(material_id),
        'source':      {'$in': ['csv_upload', 'xml_upload']}
    })

    created = 0
    for row in parsed:
        try:
            col.update_one(
                {'user_id': uid, 'material_id': str(material_id), 'date': row['date']},
                {'$set': {
                    'quantity':   row['quantity'],
                    'source':     source,
                    'notes':      row.get('notes', f'Imported from {file.name}'),
                    'created_at': datetime.now(timezone.utc),
                }},
                upsert=True
            )
            created += 1
        except Exception:
            continue

    _update_avg(uid, str(material_id))
    return Response({
        'success': True,
        'message': f'Imported {created} usage records',
        'count':   created,
    })


def _parse_csv(content):
    results = []
    try:
        reader  = csv.DictReader(io.StringIO(content.strip()))
        headers = [h.lower().strip() for h in (reader.fieldnames or [])]

        date_col = next((h for h in headers if 'date' in h), None)
        qty_col  = next((h for h in headers if any(
            k in h for k in ['qty', 'quantity', 'usage', 'amount']
        )), None)

        if not date_col or not qty_col:
            return []

        for row in reader:
            try:
                d = row.get(date_col, '').strip()
                q = float(row.get(qty_col, 0))
                if d and q >= 0:
                    results.append({'date': d, 'quantity': q, 'notes': ''})
            except (ValueError, TypeError):
                continue
    except Exception:
        pass
    return results


def _parse_xml(content):
    results = []
    pattern = re.compile(
        r'<(?:entry|record|row|item)[^>]*>(.*?)</(?:entry|record|row|item)>',
        re.DOTALL | re.IGNORECASE
    )
    for block in pattern.findall(content):
        dm = re.search(r'<date[^>]*>([^<]+)</date>', block, re.IGNORECASE)
        qm = re.search(
            r'<(?:quantity|qty|usage|amount)[^>]*>([^<]+)</(?:quantity|qty|usage|amount)>',
            block, re.IGNORECASE
        )
        if dm and qm:
            try:
                results.append({
                    'date':     dm.group(1).strip(),
                    'quantity': float(qm.group(1).strip()),
                })
            except ValueError:
                continue
    return results
