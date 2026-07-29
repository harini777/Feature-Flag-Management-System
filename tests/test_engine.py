from app.database.session import SessionLocal
from app.services.evaluation_engine import evaluate_flag


def test_evaluate_flag():
    db = SessionLocal()

    result = evaluate_flag(
        db=db,
        flag_key="dark_mode",
        environment_name="Development"
    )

    print(result)

    db.close()


if __name__ == "__main__":
    test_evaluate_flag()