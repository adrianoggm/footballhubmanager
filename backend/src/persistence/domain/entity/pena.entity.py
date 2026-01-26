from dataclasses import dataclass


@dataclass
class Pena:
    id: int
    name: str
    id_admin: int  # Corrected from str to int