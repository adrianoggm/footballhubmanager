from pydantic import BaseModel


class PenaLabelsResponse(BaseModel):
    role_labels: list[str]
    position_labels: list[str]
    role_colors: dict[str, str]
    position_colors: dict[str, str]
