from fastapi import FastAPI

from main import compare_laps
from models import ComparisonResult

app = FastAPI()

@app.get("/compare", response_model=ComparisonResult)
def get_comparison(session_id: int, driver_a: int, driver_b: int) -> ComparisonResult:
    return compare_laps(session_id, driver_a, driver_b)
