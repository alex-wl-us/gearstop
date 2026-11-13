from fastapi import APIRouter

from app.schemas.greeting import Greeting

router = APIRouter()


@router.get("/greeting", response_model=Greeting)
def get_greeting() -> Greeting:
    return Greeting(message="Hello, World!")
