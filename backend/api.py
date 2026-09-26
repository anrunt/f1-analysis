import httpx

from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager

import cache
import logging
from errors import LapNotFoundError, SameDriverError, OpenF1DataError
from main import compare_laps, fetch_drivers, fetch_sessions
from models import ComparisonResult, Driver, Session

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        datefmt="%H:%M:%S"
    )

    cache.init_cache()
    deleted = cache.delete_expired_comparisons()

    logger.info("cache_cleanup deleted %s rows", deleted)
    yield

app = FastAPI(lifespan=lifespan)

@app.get("/sessions", response_model=list[Session])
def get_sessions(year: int) -> list[Session]:
    try:
        return fetch_sessions(year)
    except OpenF1DataError:
        raise HTTPException(
            status_code=502,
            detail="OpenF1 returned data in unexpected format"
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="OpenF1 request timed out"
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=502,
            detail="Could not retrieve data from OpenF1"
        )
    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="OpenF1 returned an unsuccessful response"
        )

@app.get("/drivers", response_model=list[Driver])
def get_drivers(session_id: int) -> list[Driver]:
    try:
        return fetch_drivers(session_id)
    except OpenF1DataError:
        raise HTTPException(
            status_code=502,
            detail="OpenF1 returned data in unexpected format"
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="OpenF1 request timed out"
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=502,
            detail="Could not retrieve data from OpenF1"
        )
    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="OpenF1 returned an unsuccessful response"
        )

@app.get("/compare", response_model=ComparisonResult)
def get_comparison(session_id: int, driver_a: int, driver_b: int) -> ComparisonResult:
    try:
        return compare_laps(session_id, driver_a, driver_b)
    except SameDriverError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )
    except LapNotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )
    except OpenF1DataError:
        raise HTTPException(
            status_code=502,
            detail="OpenF1 returned data in unexpected format"
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="OpenF1 request timed out"
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=502,
            detail="Could not retrieve data from OpenF1"
        )
    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="OpenF1 returned an unsuccessful response"
        )
