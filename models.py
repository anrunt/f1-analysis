from datetime import datetime
from pydantic import BaseModel

class Session(BaseModel):
    session_key: int
    session_type: str
    session_name: str
    date_start: datetime
    date_end: datetime
    meeting_key: int
    circuit_key: int
    circuit_short_name: str
    country_key: int
    country_code: str
    country_name: str
    location: str
    gmt_offset: str
    year: int
    is_cancelled: bool

class Lap(BaseModel):
   meeting_key: int
   session_key: int
   driver_number: int
   lap_number: int
   date_start: datetime | None

   duration_sector_1: float | None
   duration_sector_2: float | None
   duration_sector_3: float | None
   lap_duration: float | None

   i1_speed: int | None
   i2_speed: int | None
   st_speed: int | None

   is_pit_out_lap: bool

   segments_sector_1: list[int | None] | None
   segments_sector_2: list[int | None] | None
   segments_sector_3: list[int | None] | None


class CarData(BaseModel):
    date: datetime
    session_key: int
    speed: int
    driver_number: int
    meeting_key: int
    rpm: int
    brake: int
    throttle: int
    drs: int
    n_gear: int

class DriverComparisonData(BaseModel):
    driver_number: int
    lap_number: int
    lap_time_s: float
    sector_times_s: list[float | None]
    speed_kmh: list[float] | None


class ComparisonResult(BaseModel):
    session_key: int
    driver_a: DriverComparisonData
    driver_b: DriverComparisonData
    lap_delta_s: float
    sector_deltas_s: list[float | None]
    relative_distance: list[float]


