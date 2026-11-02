from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.application import Application
from app.models.category import Category
from app.schemas.application import ApplicationResponse


router = APIRouter(
    prefix="/api/applications",
    tags=["Applications"],
)


@router.get("", response_model=list[ApplicationResponse])
def list_published_applications(
    search: str | None = Query(default=None, max_length=150),
    category_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
) -> list[ApplicationResponse]:
    query = (
        db.query(Application, Category.name.label("category_name"))
        .join(Category, Application.category_id == Category.id)
        .filter(Application.is_published.is_(True))
    )

    if search and search.strip():
        term = search.strip()
        query = query.filter(
            Application.name.icontains(term, autoescape=True)
            | Application.description.icontains(term, autoescape=True)
        )

    if category_id is not None:
        query = query.filter(Application.category_id == category_id)

    rows = query.order_by(Application.name, Application.id).all()
    return [
        ApplicationResponse.model_validate(
            {
                **{
                    field_name: getattr(application, field_name)
                    for field_name in ApplicationResponse.model_fields
                    if field_name != "category_name"
                },
                "category_name": category_name,
            }
        )
        for application, category_name in rows
    ]
