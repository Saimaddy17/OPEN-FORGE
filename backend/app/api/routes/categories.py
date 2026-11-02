from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.category import Category
from app.schemas.category import CategoryResponse


router = APIRouter(
    prefix="/api/categories",
    tags=["Categories"],
)


@router.get("", response_model=list[CategoryResponse])
def list_categories(db: Session = Depends(get_db)) -> list[Category]:
    return (
        db.query(Category)
        .filter(Category.is_active.is_(True))
        .order_by(Category.name)
        .all()
    )
