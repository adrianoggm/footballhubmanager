from typing import Generic, List, Optional, Type, TypeVar

from sqlalchemy.orm import Session

T = TypeVar("T")


class BaseRepository(Generic[T]):
    def __init__(self, session: Session, model: Type[T]):
        self.session = session
        self.model = model

    def get_by_id(self, id: int) -> Optional[T]:
        return self.session.query(self.model).filter(self.model.id == id).first()

    def get_all(self) -> List[T]:
        return self.session.query(self.model).all()

    def save(self, entity: T) -> T:
        self.session.add(entity)
        self.session.commit()
        self.session.refresh(entity)
        return entity

    def update(self, entity: T) -> T:
        self.session.merge(entity)
        self.session.commit()
        return entity

    def delete(self, entity: T) -> None:
        self.session.delete(entity)
        self.session.commit()

    def delete_by_id(self, id: int) -> bool:
        entity = self.get_by_id(id)
        if entity:
            self.delete(entity)
            return True
        return False

    def count(self) -> int:
        return self.session.query(self.model).count()

    def exists_by_id(self, id: int) -> bool:
        return self.session.query(self.model).filter(self.model.id == id).count() > 0
