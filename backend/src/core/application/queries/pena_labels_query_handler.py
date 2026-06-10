from __future__ import annotations

from core.application.models import PenaLabelsInfo
from core.application.ports.pena_labels_port import PenaLabelsPort
from core.application.queries.pena_labels_query import GetPenaLabelsQuery


class GetPenaLabelsHandler:
    def __init__(self, repository: PenaLabelsPort) -> None:
        self._repository = repository

    def handle(self, query: GetPenaLabelsQuery) -> PenaLabelsInfo:
        labels = self._repository.get_by_pena_guid(pena_guid=query.pena_guid)
        return PenaLabelsInfo(
            role_labels=labels.role_labels,
            position_labels=labels.position_labels,
            role_colors=labels.role_colors,
            position_colors=labels.position_colors,
        )
