from pymongo import MongoClient
from bson import ObjectId
from django.conf import settings
import threading

_client = None
_lock   = threading.Lock()

def get_client():
    global _client
    if _client is None:
        with _lock:
            if _client is None:
                _client = MongoClient(settings.MONGO_URI)
    return _client

def get_db():
    return get_client()[settings.MONGO_DB_NAME]

def get_col(name):
    return get_db()[name]

def to_id(val):
    try:
        return ObjectId(str(val))
    except Exception:
        return None

def serialize(doc):
    if doc is None:
        return None
    result = {}
    for k, v in doc.items():
        if k == '_id':
            result['id'] = str(v)
        elif isinstance(v, ObjectId):
            result[k] = str(v)
        elif isinstance(v, list):
            result[k] = [serialize(i) if isinstance(i, dict) else i for i in v]
        elif isinstance(v, dict):
            result[k] = serialize(v)
        else:
            result[k] = v
    return result

def serialize_list(docs):
    return [serialize(d) for d in docs]