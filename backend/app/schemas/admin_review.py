from pydantic import BaseModel, Field, field_validator


class SubmissionRejection(BaseModel):
    admin_comment: str = Field(min_length=1, max_length=5000)

    @field_validator("admin_comment", mode="before")
    @classmethod
    def strip_comment(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value

    @field_validator("admin_comment")
    @classmethod
    def reject_blank_comment(cls, value: str) -> str:
        if not value:
            raise ValueError("A rejection comment must not be blank.")
        return value
