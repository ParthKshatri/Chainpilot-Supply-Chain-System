from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from scm.db import get_col, to_id


class MongoJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        uid = validated_token.get('user_id')
        if not uid:
            raise InvalidToken('Token has no user_id')

        user = get_col('users').find_one({'_id': to_id(str(uid))})
        if not user or not user.get('is_active', True):
            raise InvalidToken('User not found or inactive')

        class MongoUser:
            pk               = str(user['_id'])
            id               = str(user['_id'])
            is_active        = user.get('is_active', True)
            is_authenticated = True
            def __str__(self): return user.get('email', '')

        return MongoUser()