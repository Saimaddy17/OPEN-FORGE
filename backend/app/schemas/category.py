from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
