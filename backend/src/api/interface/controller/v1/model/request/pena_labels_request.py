from pydantic import BaseModel


class UpdatePenaLabelsRequest(BaseModel):
    role_labels: list[str]
    position_labels: list[str]
    role_colors: dict[str, str] | None = None
    position_colors: dict[str, str] | None = None
