from api.dependencies.use_cases import get_nationalities_use_case
from core.application.use_cases.get_nationalities_usecase import GetNationalitiesUseCase
from fastapi import APIRouter, Depends

router = APIRouter()


@router.get("/catalogs/nationalities", response_model=list[str])
def list_nationalities(use_case: GetNationalitiesUseCase = Depends(get_nationalities_use_case)):
    return use_case.execute()
