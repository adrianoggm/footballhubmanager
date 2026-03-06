from pydantic import BaseModel


class UpdatePenaLabelsRequest(BaseModel):
    role_labels: list[str]
    position_labels: list[str]
