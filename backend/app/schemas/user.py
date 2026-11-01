
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# Developer registration request
class UserRegister(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


# Public user response
class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


# User login request
class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
