from datetime import datetime, timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
import bcrypt
from scm.db import get_col, serialize, to_id


def hash_password(raw):
    return bcrypt.hashpw(raw.encode(), bcrypt.gensalt()).decode()

def check_password(raw, hashed):
    return bcrypt.checkpw(raw.encode(), hashed.encode())

def get_uid(request):
    payload = request.auth
    return str(payload.get('user_id', ''))

def make_tokens(user_id):
    from rest_framework_simplejwt.tokens import RefreshToken

    class FakeUser:
        pk = user_id
        id = user_id
        is_active = True

    r = RefreshToken.for_user(FakeUser())
    r['user_id'] = user_id
    return str(r.access_token), str(r)

def clean_user(doc):
    u = serialize(doc)
    u.pop('password', None)
    return u


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    col   = get_col('users')
    name  = request.data.get('name','').strip()
    email = request.data.get('email','').strip().lower()
    pwd   = request.data.get('password','')
    company = request.data.get('company','').strip()

    if not name or not email or not pwd:
        return Response({'success':False,'message':'Name, email and password required'},status=400)
    if len(pwd) < 6:
        return Response({'success':False,'message':'Password min 6 chars'},status=400)
    if col.find_one({'email':email}):
        return Response({'success':False,'message':'Email already registered'},status=400)

    doc = {'name':name,'email':email,'password':hash_password(pwd),
           'company':company,'role':'manager','is_active':True,
           'last_login':None,'created_at':datetime.now(timezone.utc)}
    res = col.insert_one(doc)
    doc['_id'] = res.inserted_id
    access, refresh = make_tokens(str(res.inserted_id))
    return Response({'success':True,'token':access,'refresh':refresh,'user':clean_user(doc)},status=201)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    col   = get_col('users')
    email = request.data.get('email','').strip().lower()
    pwd   = request.data.get('password','')
    user  = col.find_one({'email':email})
    if not user or not check_password(pwd, user['password']):
        return Response({'success':False,'message':'Invalid credentials'},status=401)
    if not user.get('is_active',True):
        return Response({'success':False,'message':'Account deactivated'},status=401)
    col.update_one({'_id':user['_id']},{'$set':{'last_login':datetime.now(timezone.utc)}})
    access, refresh = make_tokens(str(user['_id']))
    return Response({'success':True,'token':access,'refresh':refresh,'user':clean_user(user)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    uid  = get_uid(request)
    user = get_col('users').find_one({'_id':to_id(uid)})
    if not user:
        return Response({'success':False,'message':'Not found'},status=404)
    return Response({'success':True,'user':clean_user(user)})


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    uid = get_uid(request)
    col = get_col('users')
    upd = {k:request.data[k] for k in ['name','company'] if k in request.data}
    col.update_one({'_id':to_id(uid)},{'$set':upd})
    user = col.find_one({'_id':to_id(uid)})
    return Response({'success':True,'user':clean_user(user)})
