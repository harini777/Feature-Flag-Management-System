from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.flag_routes import router

app = FastAPI(
    title="Feature Flag Management System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "Feature flag management system is running"
    }


app.include_router(router)
