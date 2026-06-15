import jwt
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

SECRET_KEY = "NEUROPREDICT_SUPER_SECURE_JWT_SECRET_KEY_FOR_DEMONSTRATION"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 600

class UserTokenPayload(BaseModel):
    sub: str
    role: str
    scopes: List[str]

security_bearer = HTTPBearer()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates a secure signed JWT Access Token encoding patient/practitioner credentials and roles.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> UserTokenPayload:
    """
    Decodes and validates a secure JWT token, verifying active clinical roles.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        scopes: List[str] = payload.get("scopes", [])
        if username is None or role is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credentials could not be verified: missing claims."
            )
        return UserTokenPayload(sub=username, role=role, scopes=scopes)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials: token expired or invalid signature."
        )

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security_bearer)) -> UserTokenPayload:
    """
    Dependency injection helper to secure API endpoints.
    """
    return decode_access_token(credentials.credentials)

class RoleChecker:
    """
    Decorator dependency class to restrict endpoints based on Role-Based Access Control (RBAC).
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: UserTokenPayload = Depends(get_current_user)) -> UserTokenPayload:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Action requires one of roles: {self.allowed_roles}. Found role: {user.role}"
            )
        return user
