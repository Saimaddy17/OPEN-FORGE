from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_developer
from app.database.connection import get_db
from app.models.category import Category
from app.models.submission import Submission
from app.models.user import User
from app.schemas.submission import SubmissionCreate, SubmissionResponse


router = APIRouter(
    prefix="/api/submissions",
    tags=["Submissions"],
)


@router.post(
    "",
    response_model=SubmissionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_submission(
    submission_data: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_developer),
) -> Submission:
    category = (
        db.query(Category)
        .filter(
            Category.id == submission_data.category_id,
            Category.is_active.is_(True),
        )
        .first()
    )
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="The selected category does not exist or is inactive.",
        )

    submission = Submission(
        developer_id=current_user.id,
        proposed_name=submission_data.proposed_name,
        short_description=submission_data.short_description,
        description=submission_data.description or submission_data.short_description,
        category_id=submission_data.category_id,
        repository_url=(
            str(submission_data.repository_url)
            if submission_data.repository_url
            else None
        ),
        project_type=submission_data.project_type,
        official_website=(
            str(submission_data.official_website)
            if submission_data.official_website
            else None
        ),
        download_url=(
            str(submission_data.download_url)
            if submission_data.download_url
            else None
        ),
        license=submission_data.license,
        version=submission_data.version,
        logo_url=str(submission_data.logo_url) if submission_data.logo_url else None,
        status="pending",
    )
    db.add(submission)

    try:
        db.commit()
        db.refresh(submission)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The submission could not be saved because related data changed.",
        ) from exc

    return submission


@router.get("/my", response_model=list[SubmissionResponse])
def list_my_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_developer),
) -> list[Submission]:
    return (
        db.query(Submission)
        .filter(Submission.developer_id == current_user.id)
        .order_by(Submission.submitted_at.desc(), Submission.id.desc())
        .all()
    )
