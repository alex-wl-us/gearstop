from fastapi import APIRouter

from app.api import calculator, health

router = APIRouter()

router.include_router(health.router)
router.include_router(calculator.router)
