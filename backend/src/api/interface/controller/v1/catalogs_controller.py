from fastapi import APIRouter, Depends
from persistence.application.use_cases.get_nationalities import GetNationalitiesUseCase
from persistence.infrastructure.repository.db.nationality_query_repository import (
    SqlAlchemyNationalityQueryRepository,
)
from persistence.module import get_db
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/catalogs/nationalities", response_model=list[str])
def list_nationalities(db: Session = Depends(get_db)):
    repository = SqlAlchemyNationalityQueryRepository(db)
    use_case = GetNationalitiesUseCase(repository)
    return use_case.execute()
