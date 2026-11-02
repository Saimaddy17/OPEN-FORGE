from datetime import datetime

from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    field_validator,
    model_validator,
)


class SubmissionCreate(BaseModel):
    proposed_name: str = Field(min_length=1, max_length=150)
    short_description: str = Field(min_length=1, max_length=300)
    description: str | None = None
    category_id: int = Field(gt=0)
    project_type: Literal["source", "installer"] = "source"
    repository_url: HttpUrl | None = Field(default=None, max_length=500)
    official_website: HttpUrl | None = Field(default=None, max_length=500)
    download_url: HttpUrl | None = Field(default=None, max_length=500)
    license: str | None = Field(default=None, max_length=100)
    version: str | None = Field(default=None, max_length=50)
    logo_url: HttpUrl | None = Field(default=None, max_length=500)

    @field_validator(
        "proposed_name",
        "short_description",
        "description",
        "version",
        mode="before",
    )
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return value.strip() if isinstance(value, str) else value

    @field_validator("license", mode="before")
    @classmethod
    def normalize_license(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("proposed_name", "short_description")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        if not value:
            raise ValueError("This field must not be blank.")
        return value

    @model_validator(mode="after")
    def validate_project_urls(self) -> "SubmissionCreate":
        if self.project_type == "source" and self.repository_url is None:
            raise ValueError("Source projects require a repository_url.")
        if self.project_type == "installer" and self.download_url is None:
            raise ValueError("Installer projects require a download_url.")
        return self


class SubmissionResponse(BaseModel):
    id: int
    developer_id: int
    application_id: int | None
    proposed_name: str
    short_description: str
    description: str
    category_id: int
    repository_url: str | None
    official_website: str | None
    download_url: str | None
    license: str | None
    project_type: Literal["source", "installer"]
    version: str | None
    logo_url: str | None
    status: str
    admin_comment: str | None
    reviewed_by: int | None
    submitted_at: datetime
    reviewed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
