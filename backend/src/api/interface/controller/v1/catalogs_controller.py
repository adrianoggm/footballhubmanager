from api.dependencies.use_cases import get_nationalities_query_bus
from core.application.queries.nationality_query import GetNationalitiesQuery
from fastapi import APIRouter, Depends
from shared.application.bus.buses import QueryBus

router = APIRouter()


@router.get("/catalogs/nationalities", response_model=list[str])
def list_nationalities(query_bus: QueryBus = Depends(get_nationalities_query_bus)):
    return query_bus.ask(GetNationalitiesQuery())
