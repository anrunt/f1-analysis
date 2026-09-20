from datetime import timedelta
from datetime import datetime
from time import sleep

import httpx
from pydantic import TypeAdapter, ValidationError
from models import CarData, Session, Lap
import pandas as pd

def fetch_laps(session_key: int, driver_number: int) -> list[Lap]:
    lap_params = {"session_key": session_key, "driver_number": driver_number}
    sleep(1)
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

def fetch_car_data(lap: Lap) -> list[CarData] | None:
    if lap.date_start is None or lap.lap_duration is None:
        return None

    lap_duration = timedelta(seconds=lap.lap_duration)

    lap_end = lap.date_start + lap_duration

    car_data_params = {
        "date>": lap.date_start.isoformat(),
        "date<": lap_end.isoformat(),
        "driver_number": lap.driver_number,
        "session_key": lap.session_key
    }

    sleep(1)
    car_data = httpx.get("https://api.openf1.org/v1/car_data", params=car_data_params, timeout=10)

    car_data.raise_for_status()

    try:
        validated_car_data = TypeAdapter(list[CarData]).validate_json(car_data.content)
    except ValidationError as error:
        raise ValueError("Error when parsing car data") from error

    return validated_car_data

def prepare_telemetry(samples: list[CarData], lap_start: datetime) -> pd.DataFrame:
    data = [sample.model_dump() for sample in samples]

    df = pd.DataFrame(data)

    df["date"] = pd.to_datetime(df["date"], utc=True)

    df = df.sort_values("date")

    df["time_s"] = (df["date"] - lap_start).dt.total_seconds()

    df["speed_m_s"] = df["speed"] / 3.6


    return df

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

    sleep(1)
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

    delta_label = f"Delta {first_driver[:3].upper()} − {second_driver[:3].upper()}"
    print(f"\n{'Sektor':<8} {first_driver:>10} {second_driver:>10}  {delta_label}")

    for sector_number in range(1, 4):
        duration_sector_string = f"duration_sector_{sector_number}"

        first_duration: float | None = getattr(first_driver_lap, duration_sector_string)
        second_duration: float | None = getattr(second_driver_lap, duration_sector_string)

        first_text = f"{first_duration:.3f}" if first_duration is not None else "brak"
        second_text = f"{second_duration:.3f}" if second_duration is not None else "brak"

        delta_text = "brak danych"
        if first_duration is not None and second_duration is not None:
            sector_duration_delta = first_duration - second_duration
            delta_text = f"{sector_duration_delta:.3f} s"

        sector_label = f"S{sector_number}"
        print(f"{sector_label:<8} {first_text:>10} {second_text:>10}  {delta_text}")

    print()

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


    car_data = fetch_car_data(first_driver_lap)

    if car_data is None:
        print("Lap date start or lap duration is null")
    elif len(car_data) == 0:
        print(f"No car data for {first_driver}")
    else:
        print(f"data_length: {len(car_data)}")
        sorted_car_data = sorted(car_data, key=lambda data: data.date)

        for counter, data in enumerate(sorted_car_data[:5]):
            assert first_driver_lap.date_start is not None
            relative_time = (data.date - first_driver_lap.date_start).total_seconds()
            speed = data.speed
            throttle = data.throttle
            brake = data.brake

            print(f"Data Point {counter}:")
            print(f"Relative Time: {relative_time:.3f} s, Speed: {speed:.3f} km/h, Throttle: {throttle:.3f}, Brake: {brake:.3f}")

        assert first_driver_lap.date_start is not None
        df = prepare_telemetry(car_data, first_driver_lap.date_start)
        print(df.head(5))
    



if __name__ == "__main__":
    main()
