from datetime import datetime

import httpx
from pydantic import BaseModel, TypeAdapter, ValidationError
from pydantic.type_adapter import TypeAdapterT


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


def main():
    session_params = {
        "country_name": "Italy",
        "session_name": "Qualifying",
        "year": 2024,
    }

    sessions = httpx.get(
        "https://api.openf1.org/v1/sessions", params=session_params, timeout=10
    )

    sessions.raise_for_status()

    try:
        validate_session = TypeAdapter(list[Session]).validate_json(sessions.content)
    except ValidationError as error:
        print("Error when parsing session data: ", error)
        return

    print(f"Downloaded {len(validate_session)} sessions")

    selected_session: Session | None = None
    for data in validate_session:
        if data.session_type == "Qualifying" and data.circuit_short_name == "Monza":
            print("Found Monza")
            print("Session Key: ", data.session_key)
            print("Session Name: ", data.session_name)
            print("Date Start: ", data.date_start)
            selected_session = data
            break

    if selected_session == None:
        print("No qualifying session found for Monza in 2024.")
        return

    lap_params = {"session_key": selected_session.session_key, "driver_number": 4}
    laps = httpx.get("https://api.openf1.org/v1/laps", params=lap_params)

    laps.raise_for_status()

    try:
        validate_laps = TypeAdapter(list[Lap]).validate_json(laps.content)
    except ValidationError as error:
        print("Error when parsing lap data: ", error)
        return

    print(f"Downloaded {len(validate_laps)} laps for driver number {lap_params["driver_number"]}")

    fastest_lap: Lap | None = None
    for lap in validate_laps:
        if lap.lap_duration and lap.lap_duration > 0 and lap.is_pit_out_lap == False:
            if fastest_lap == None:
                fastest_lap = lap
            else:
                if fastest_lap.lap_duration is not None and fastest_lap.lap_duration > lap.lap_duration:
                    fastest_lap = lap

    if fastest_lap == None:
        print("No fastest lap")
        return

    print(f"Fastest lap: {fastest_lap.lap_duration}")



if __name__ == "__main__":
    main()
