from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import UserResponse, UserCreate

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login")
def login(username: str = "admin", password: str = "admin123"):
    # Pre-authenticated session for operator/admin
    return {
        "status": "success",
        "user": {
            "username": username,
            "role": "Superintendent / Chief Operator",
            "token": "hallticket_pro_jwt_token_2026"
        }
    }

@router.get("/me")
def get_current_user():
    return {
        "username": "exam_operator",
        "role": "Examination Center Administrator",
        "center": "Main Center Hall A"
    }
