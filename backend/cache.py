from pathlib import Path
import sqlite3
import time

from pydantic import ValidationError

from models import ComparisonResult

DB_PATH = Path(__file__).parent/"data"/"comparisons.sqlite3"

CREATE_DB_STATEMENT = """
    CREATE TABLE IF NOT EXISTS comparison_cache (
        session_key INTEGER NOT NULL,
        driver_a_number INTEGER NOT NULL,
        driver_b_number INTEGER NOT NULL,
        result_json TEXT NOT NULL,
        created_at REAL NOT NULL,
        expires_at REAL NOT NULL,
        PRIMARY KEY (session_key, driver_a_number, driver_b_number)
    )
"""

INSERT_VALUES_STATEMENT = """
    INSERT INTO comparison_cache (
        session_key, driver_a_number, driver_b_number, result_json,
        created_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (session_key, driver_a_number, driver_b_number)
    DO UPDATE SET
        result_json = excluded.result_json,
        created_at = excluded.created_at,
        expires_at = excluded.expires_at
"""

SELECT_VALUES_STATEMENT = """
    SELECT result_json, expires_at 
    FROM comparison_cache
    WHERE session_key = ?
        AND driver_a_number = ?
        AND driver_b_number = ?
"""

def init_cache():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(DB_PATH)

    try:
        connection.execute(CREATE_DB_STATEMENT)
    finally:
        connection.close()

def save_comparison(result: ComparisonResult, ttl_seconds: int) -> None:
    if ttl_seconds <= 0:
        raise ValueError("ttl_seconds less or equal 0")

    session_key = result.session_key

    driver_a_number = result.driver_a.driver_number
    driver_b_number = result.driver_b.driver_number

    result_json = result.model_dump_json()

    created_at = time.time()
    expires_at = created_at + ttl_seconds

    values_to_insert = (session_key, driver_a_number, driver_b_number, result_json, created_at, expires_at)

    connection = sqlite3.connect(DB_PATH)

    try:
        with connection:
            connection.execute(INSERT_VALUES_STATEMENT, values_to_insert)
    finally:
        connection.close()

def get_comparison(session_key: int, driver_a_number: int, driver_b_number: int) -> ComparisonResult | None:
    connection = sqlite3.connect(DB_PATH)

    values_to_select = (session_key, driver_a_number, driver_b_number)

    try:
        cursor = connection.cursor()
        cursor.execute(SELECT_VALUES_STATEMENT, values_to_select)

        result = cursor.fetchone()
    finally:
        connection.close()


    if result is None:
        return None

    result_json, expires_at = result

    if expires_at <= time.time():
        return None

    try:
        validated_json = ComparisonResult.model_validate_json(result_json)
    except ValidationError:
        return None

    return validated_json

