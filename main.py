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

def fetch_laps(session_key: int, driver_number: int) -> list[Lap]:
    lap_params = {"session_key": session_key, "driver_number": driver_number}
    laps = httpx.get("https://api.openf1.org/v1/laps", params=lap_params, timeout=10)

    laps.raise_for_status()

    try:
        validate_laps = TypeAdapter(list[Lap]).validate_json(laps.content)
    except ValidationError as error:
        raise ValueError("Error when parsing lap data") from error

    print(f"Downloaded {len(validate_laps)} laps for driver number {lap_params["driver_number"]}")
    return validate_laps

def find_fastest_lap(laps: list[Lap]) -> Lap | None:
    fastest_lap: Lap | None = None
    for lap in laps:
        if lap.lap_duration is not None and lap.lap_duration > 0 and lap.is_pit_out_lap == False:
            if fastest_lap == None:
                fastest_lap = lap
            else:
                if fastest_lap.lap_duration is not None and fastest_lap.lap_duration > lap.lap_duration:
                    fastest_lap = lap

    return fastest_lap

def main():
    session_params = {
        "country_name": "Italy",
        "session_name": "Qualifying",
        "year": 2024,
    }

    drivers = {
        "Norris" : 4,
        "Piastri": 81
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


    drivers_fastest_lap: dict[str, Lap] = {}
    for name, number in drivers.items():
        laps = fetch_laps(selected_session.session_key, number)
        fastest_lap = find_fastest_lap(laps)

        if fastest_lap == None:
            print(f"{name} has not set fastest_lap")
            return

        drivers_fastest_lap[name] = fastest_lap

    
    (first_driver, first_driver_lap), (second_driver, second_driver_lap) = drivers_fastest_lap.items()

    assert first_driver_lap.lap_duration is not None
    assert second_driver_lap.lap_duration is not None

    delta = first_driver_lap.lap_duration - second_driver_lap.lap_duration

    print(f"{first_driver} fastest lap: {first_driver_lap.lap_duration:.3f} seconds lap number: {first_driver_lap.lap_number}")
    print(f"{second_driver} fastest lap: {second_driver_lap.lap_duration:.3f} seconds lap number: {second_driver_lap.lap_number}")
    if delta < 0:
        print(f"{first_driver} was faster than {second_driver} by {abs(delta):.3f} seconds")
    elif delta > 0:
        print(f"{second_driver} was faster than {first_driver} by {abs(delta):.3f} seconds")
    elif delta == 0:
        print(f"{first_driver} and {second_driver} had the same lap time of {first_driver_lap.lap_duration:.3f} seconds")

if __name__ == "__main__":
    main()
