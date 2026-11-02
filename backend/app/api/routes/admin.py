import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_admin
from app.database.connection import get_db
from app.models.application import Application
from app.models.submission import Submission
from app.models.user import User
from app.schemas.admin_review import SubmissionRejection
from app.schemas.submission import SubmissionResponse


router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
)


def _get_pending_submission(db: Session, submission_id: int) -> Submission:
    submission = (
        db.query(Submission)
        .filter(Submission.id == submission_id)
        .with_for_update()
        .first()
    )
    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found.",
        )
    if submission.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending submissions can be reviewed.",
        )
    if submission.application_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The pending submission already has a linked application.",
        )
    return submission


def _application_slug(name: str, submission_id: int) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.casefold()).strip("-")
    suffix = f"-{submission_id}"
    base = (base or "application")[: 180 - len(suffix)].rstrip("-")
    return f"{base}{suffix}"


@router.get(
    "/submissions/pending",
    response_model=list[SubmissionResponse],
)
def list_pending_submissions(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> list[Submission]:
    return (
        db.query(Submission)
        .filter(Submission.status == "pending")
        .order_by(Submission.submitted_at, Submission.id)
        .all()
    )


@router.post(
    "/submissions/{submission_id}/approve",
    response_model=SubmissionResponse,
)
def approve_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> Submission:
    submission = _get_pending_submission(db, submission_id)
    application = Application(
        name=submission.proposed_name,
        slug=_application_slug(submission.proposed_name, submission.id),
        short_description=submission.short_description,
        description=submission.description,
        developer_id=submission.developer_id,
        category_id=submission.category_id,
        repository_url=submission.repository_url,
        project_type=submission.project_type,
        official_website=submission.official_website,
        download_url=submission.download_url,
        license=submission.license,
        version=submission.version,
        logo_url=submission.logo_url,
        is_published=True,
    )
    db.add(application)

    try:
        db.flush()
        submission.application_id = application.id
        submission.status = "approved"
        submission.reviewed_by = current_admin.id
        submission.reviewed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(submission)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The application could not be published because of a data conflict.",
        ) from exc

    return submission


@router.post(
    "/submissions/{submission_id}/reject",
    response_model=SubmissionResponse,
)
def reject_submission(
    submission_id: int,
    rejection: SubmissionRejection,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> Submission:
    submission = _get_pending_submission(db, submission_id)
    submission.status = "rejected"
    submission.admin_comment = rejection.admin_comment
    submission.reviewed_by = current_admin.id
    submission.reviewed_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(submission)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The submission could not be rejected because of a data conflict.",
        ) from exc

    return submission
