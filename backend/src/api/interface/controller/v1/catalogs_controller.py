from fastapi import APIRouter, Depends
from persistence.application.use_cases.get_nationalities_usecase import GetNationalitiesUseCase
from persistence.infrastructure.repository.db.nationality_query_repository import (
    SqlAlchemyNationalityQueryRepository,
)
from persistence.module import get_db
from sqlalchemy.orm import Session

router = APIRouter()


def get_nationalities_use_case(db: Session = Depends(get_db)) -> GetNationalitiesUseCase:
    repository = SqlAlchemyNationalityQueryRepository(db)
    return GetNationalitiesUseCase(repository)


@router.get("/catalogs/nationalities", response_model=list[str])
def list_nationalities(use_case: GetNationalitiesUseCase = Depends(get_nationalities_use_case)):
    return use_case.execute()
