from datetime import timedelta
from datetime import datetime
from time import sleep

import httpx
from pydantic import TypeAdapter, ValidationError
from models import CarData, ComparisonResult, DriverComparisonData, Session, Lap
import pandas as pd
import numpy as np

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

    df["dt_s"] = df["time_s"].diff()

    df["distance_step_m"] = ((df["speed_m_s"].shift() + df["speed_m_s"]) / 2) * df["dt_s"]

    df.loc[df.index[0], "distance_step_m"] = 0

    df["distance_m"] = df["distance_step_m"].cumsum()

    final_distance = df["distance_m"].iloc[-1]
    if final_distance <= 0:
        raise ValueError("Final distance must be greater than zero!")

    df["relative_distance"] = df["distance_m"] / final_distance

    return df

def resample_speed(grid, df: pd.DataFrame):
    if len(df) < 2:
        raise ValueError("Need at least 2 samples for resampling_speed")

    relative_distance = df["relative_distance"].to_numpy()
    if not np.all(np.isfinite(relative_distance)):
        raise ValueError("Relative distance must be finite")

    speed = df["speed"].to_numpy()  
    if not np.all(np.isfinite(speed)):
        raise ValueError("Speed must be finite")

    if not np.all(np.diff(relative_distance) > 0):
        raise ValueError("Relative distances are not strictly increasing")

    # Not really necessary for now but its in case someone changes grid creation
    if grid.min() < relative_distance[0]:
        raise ValueError("Grid starts before source data")

    # Not really necessary for now but its in case someone changes grid creation
    if grid.max() > relative_distance[-1]:
        raise ValueError("Grid ends after source data")


    resampled_speed = np.interp(grid, relative_distance, speed)

    df = pd.DataFrame({
        "relative_distance": grid,
        "speed_kmh": resampled_speed
    })

    return df

def compare_laps(session_key: int, driver_a: int, driver_b: int) -> ComparisonResult:
    if driver_a == driver_b:
        raise ValueError("Pick two different drivers")

    drivers_fastest_lap: dict[int, Lap] = {}

    for number in [driver_a, driver_b]:
        laps = fetch_laps(session_key, number)
        fastest_lap = find_fastest_lap(laps)

        if fastest_lap is None:
            raise ValueError(f"Driver nr.{number} has not set fastest_lap")

        drivers_fastest_lap[number] = fastest_lap

    (_, driver_a_lap), (_, driver_b_lap) = drivers_fastest_lap.items()

    sector_times_a = [
        driver_a_lap.duration_sector_1,
        driver_a_lap.duration_sector_2,
        driver_a_lap.duration_sector_3
    ]

    sector_times_b = [
        driver_b_lap.duration_sector_1,
        driver_b_lap.duration_sector_2,
        driver_b_lap.duration_sector_3
    ]

    sector_deltas_s = []
    for sector_a, sector_b in zip(sector_times_a, sector_times_b):
        if sector_a is not None and sector_b is not None:
            sector_deltas_s.append(sector_a - sector_b)
        else:
            sector_deltas_s.append(None)

    if driver_a_lap.lap_duration is None or driver_b_lap.lap_duration is None:
        raise ValueError("One of the drivers lap durations is none")
        
    lap_delta_s = driver_a_lap.lap_duration - driver_b_lap.lap_duration


    grid = np.linspace(0, 1, 1001)

    speed_by_driver: dict[int, list[float] | None] = {
        driver_a: None,
        driver_b: None
    }

    for driver, fastest_lap in drivers_fastest_lap.items():
        car_data = fetch_car_data(fastest_lap)

        if car_data is None:
            print("Lap date start or lap duration is null")
        elif len(car_data) == 0:
            print(f"No car data for {driver}")
        else:
            print(f"data_length: {len(car_data)}")

            assert fastest_lap.date_start is not None
            telemetry_df = prepare_telemetry(car_data, fastest_lap.date_start)

            resampled_speed_df = resample_speed(grid, telemetry_df)

            speed_by_driver[driver] = resampled_speed_df["speed_kmh"].tolist()


    driver_a_data = DriverComparisonData(
        driver_number=driver_a,
        lap_number=driver_a_lap.lap_number,
        lap_time_s=driver_a_lap.lap_duration,
        sector_times_s=sector_times_a,
        speed_kmh=speed_by_driver[driver_a]
    )

    driver_b_data = DriverComparisonData(
        driver_number=driver_b,
        lap_number=driver_b_lap.lap_number,
        lap_time_s=driver_b_lap.lap_duration,
        sector_times_s=sector_times_b,
        speed_kmh=speed_by_driver[driver_b]
    )

    comparison_result = ComparisonResult(
        session_key=session_key,
        driver_a=driver_a_data,
        driver_b=driver_b_data,
        lap_delta_s=lap_delta_s,
        sector_deltas_s=sector_deltas_s,
        relative_distance=grid.tolist()
    )

    return comparison_result


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

    data = compare_laps(selected_session.session_key, drivers["Norris"], drivers["Piastri"])

    print(data)

if __name__ == "__main__":
    main()
