"""Handlers de los comandos de escritura de temporadas de peña."""

from __future__ import annotations

from core.application.commands.pena_season_commands import (
    CreatePenaSeasonCommand,
    DeletePenaSeasonCommand,
    UpdatePenaSeasonCommand,
)
from core.application.models import PenaSeasonInfo
from core.application.ports.pena_season_port import PenaSeasonPort, PenaSeasonResult
from core.domain.errors import InvalidPenaSeasonDataError
from core.domain.value_objects.season_date_range import SeasonDateRange


def _to_info(season: PenaSeasonResult) -> PenaSeasonInfo:
    return PenaSeasonInfo(
        guid=season.guid,
        start_date=season.start_date,
        end_date=season.end_date,
        points_win=season.points_win,
        points_draw=season.points_draw,
        points_loss=season.points_loss,
    )


class CreatePenaSeasonHandler:
    def __init__(self, repository: PenaSeasonPort) -> None:
        self._repository = repository

    def handle(self, command: CreatePenaSeasonCommand) -> PenaSeasonInfo:
        # Invariante de dominio: rango de fechas válido.
        SeasonDateRange(start_date=command.start_date, end_date=command.end_date)
        created = self._repository.create_for_admin(
            pena_guid=command.pena_guid,
            admin_id=command.admin_id,
            start_date=command.start_date,
            end_date=command.end_date,
            points_win=command.points_win,
            points_draw=command.points_draw,
            points_loss=command.points_loss,
        )
        return _to_info(created)


class UpdatePenaSeasonHandler:
    def __init__(self, repository: PenaSeasonPort) -> None:
        self._repository = repository

    def handle(self, command: UpdatePenaSeasonCommand) -> PenaSeasonInfo:
        fields = (
            command.start_date,
            command.end_date,
            command.points_win,
            command.points_draw,
            command.points_loss,
        )
        if not any(field_update.is_set() for field_update in fields):
            raise InvalidPenaSeasonDataError()
        if command.start_date.is_set() and command.start_date.value is None:
            raise InvalidPenaSeasonDataError()
        if command.end_date.is_set() and command.end_date.value is None:
            raise InvalidPenaSeasonDataError()
        if command.points_win.is_set() and command.points_win.value is None:
            raise InvalidPenaSeasonDataError()
        if command.points_draw.is_set() and command.points_draw.value is None:
            raise InvalidPenaSeasonDataError()
        if command.points_loss.is_set() and command.points_loss.value is None:
            raise InvalidPenaSeasonDataError()
        if (
            command.start_date.is_set()
            and command.end_date.is_set()
            and command.start_date.value is not None
            and command.end_date.value is not None
            and command.start_date.value > command.end_date.value
        ):
            raise InvalidPenaSeasonDataError()

        updated = self._repository.update_for_admin(
            pena_guid=command.pena_guid,
            season_guid=command.season_guid,
            admin_id=command.admin_id,
            start_date=command.start_date,
            end_date=command.end_date,
            points_win=command.points_win,
            points_draw=command.points_draw,
            points_loss=command.points_loss,
        )
        return _to_info(updated)


class DeletePenaSeasonHandler:
    def __init__(self, repository: PenaSeasonPort) -> None:
        self._repository = repository

    def handle(self, command: DeletePenaSeasonCommand) -> None:
        self._repository.delete_for_admin(
            pena_guid=command.pena_guid,
            season_guid=command.season_guid,
            admin_id=command.admin_id,
        )
