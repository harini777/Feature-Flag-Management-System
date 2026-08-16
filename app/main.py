from fastapi import FastAPI
from app.api.flag_routes import router
app = FastAPI()
@app.get("/")
def home():
    return {
        "message": "Feature flag management system is running" 
        }
app.include_router(router)