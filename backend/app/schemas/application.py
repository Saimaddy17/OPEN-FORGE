from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class ApplicationResponse(BaseModel):
    id: int
    name: str
    slug: str
    short_description: str
    description: str
    category_id: int
    category_name: str
    repository_url: str | None
    official_website: str | None
    download_url: str | None
    license: str | None
    project_type: Literal["source", "installer"]
    version: str | None
    logo_url: str | None
    developer_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
