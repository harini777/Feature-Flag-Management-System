from app.database.session import SessionLocal
from app.services.evaluation_engine import evaluate_flag

db = SessionLocal()

result = evaluate_flag(
    db=db,
    flag_key="dark_mode",
    environment_name="production",
    user_context={
        "user_id":101,
        "groups":["admin"],
        "country":"India"
    }
)

print(result)
db.close()