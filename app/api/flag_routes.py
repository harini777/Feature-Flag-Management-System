from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.feat_flag import FlagCreate, FlagUpdate
from app.schemas.evaluation import EvaluationRequest
from app.services.evaluation_engine import evaluate_flag

router = APIRouter(prefix="/flags", tags=["Feature Flags"])


@router.post("/evaluate")
def evaluate(
    request: EvaluationRequest,
    db: Session = Depends(get_db)
):
    return evaluate_flag(
        db=db,
        flag_key=request.flag_key,
        environment_name=request.environment_name,
        user_context=request.user_context
    )