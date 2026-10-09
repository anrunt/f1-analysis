from datetime import timedelta
from datetime import datetime
from time import sleep

import httpx
import logging
from pydantic import TypeAdapter, ValidationError
import cache
from models import CarData, ComparisonResult, Driver, DriverComparisonData, Session, Lap
from errors import SameDriverError, LapNotFoundError, OpenF1DataError
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

def fetch_sessions(year: int) -> list[Session]:
    session_params = {"year": year, "session_name": "Qualifying"}

    sleep(1)
    sessions = httpx.get("https://api.openf1.org/v1/sessions", params=session_params, timeout=10)

    sessions.raise_for_status()

    try:
        validated_sessions = TypeAdapter(list[Session]).validate_json(sessions.content)
    except ValidationError as error:
        raise OpenF1DataError("OpenF1 returned invalid session data") from error

    return validated_sessions


def fetch_drivers(session_key: int) -> list[Driver]:
    driver_params = {"session_key": session_key}

    sleep(1)
    drivers = httpx.get("https://api.openf1.org/v1/drivers", params=driver_params, timeout=10)

    drivers.raise_for_status()

    try:
        validated_drivers = TypeAdapter(list[Driver]).validate_json(drivers.content)
    except ValidationError as error:
        raise OpenF1DataError("OpenF1 returned invalid driver data") from error

    return validated_drivers


def fetch_laps(session_key: int, driver_number: int) -> list[Lap]:
    lap_params = {"session_key": session_key, "driver_number": driver_number}
    sleep(1)
    laps = httpx.get("https://api.openf1.org/v1/laps", params=lap_params, timeout=10)

    laps.raise_for_status()

    try:
        validate_laps = TypeAdapter(list[Lap]).validate_json(laps.content)
    except ValidationError as error:
        raise OpenF1DataError("OpenF1 returned invalid data lap") from error

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
        raise OpenF1DataError("OpenF1 returned invalid car data") from error

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

    print(df.head(5))

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

def resample_throttle(grid, df: pd.DataFrame):
    if len(df) < 2:
        raise ValueError("Need at least 2 samples for resampling throttle")

    relative_distance = df["relative_distance"].to_numpy()
    if not np.all(np.isfinite(relative_distance)):
        raise ValueError("Relative distance must be finite")

    throttle = df["throttle"].to_numpy(dtype=float, na_value=np.nan, copy=True)
    valid_throttle = np.isfinite(throttle) & (throttle >= 0) & (throttle <= 100)
    throttle[~valid_throttle] = np.nan

    if not np.all(np.diff(relative_distance) > 0):
        raise ValueError("Relative distances are not strictly increasing")

    # Not really necessary for now but its in case someone changes grid creation
    if grid.min() < relative_distance[0]:
        raise ValueError("Grid starts before source data")

    # Not really necessary for now but its in case someone changes grid creation
    if grid.max() > relative_distance[-1]:
        raise ValueError("Grid ends after source data")

    resampled_throttle = np.interp(grid, relative_distance, throttle)

    df = pd.DataFrame({
        "relative_distance": grid,
        "throttle_percent": resampled_throttle 
    })

    return df

def resample_brake(grid, df: pd.DataFrame):
    if len(df) < 2:
        raise ValueError("Need at least 2 samples for resampling brake")

    relative_distance = df["relative_distance"].to_numpy()
    if not np.all(np.isfinite(relative_distance)):
        raise ValueError("Relative distance must be finite")

    brake = df["brake"].to_numpy(dtype=float, na_value=np.nan, copy=True)
    valid_brake = np.isin(brake, [0, 100])
    brake[~valid_brake] = np.nan

    if not np.all(np.diff(relative_distance) > 0):
        raise ValueError("Relative distances are not strictly increasing")

    # Not really necessary for now but its in case someone changes grid creation
    if grid.min() < relative_distance[0]:
        raise ValueError("Grid starts before source data")

    # Not really necessary for now but its in case someone changes grid creation
    if grid.max() > relative_distance[-1]:
        raise ValueError("Grid ends after source data")

    indices = np.searchsorted(relative_distance, grid, side="right") - 1

    resampled_brake = brake[indices]
    brake_on = pd.array(resampled_brake == 100, dtype="boolean")
    brake_on[np.isnan(resampled_brake)] = pd.NA

    df = pd.DataFrame({
        "relative_distance": grid,
        "brake_on": brake_on
    })

    return df

def resample_gear(grid, df: pd.DataFrame):
    if len(df) < 2:
        raise ValueError("Need at least 2 samples for resampling gear")

    relative_distance = df["relative_distance"].to_numpy()
    if not np.all(np.isfinite(relative_distance)):
        raise ValueError("Relative distance must be finite")

    gear = df["n_gear"].to_numpy(dtype=float, na_value=np.nan, copy=True)
    valid_gear = np.isin(gear, [0, 1, 2, 3, 4, 5, 6, 7, 8])
    gear[~valid_gear] = np.nan

    if not np.all(np.diff(relative_distance) > 0):
        raise ValueError("Relative distances are not strictly increasing")

    # Not really necessary for now but its in case someone changes grid creation
    if grid.min() < relative_distance[0]:
        raise ValueError("Grid starts before source data")

    # Not really necessary for now but its in case someone changes grid creation
    if grid.max() > relative_distance[-1]:
        raise ValueError("Grid ends after source data")

    indices = np.searchsorted(relative_distance, grid, side="right") - 1

    resampled_gear = gear[indices]
    n_gear = pd.array(resampled_gear, dtype="Int64")

    df = pd.DataFrame({
        "relative_distance": grid,
        "n_gear": n_gear
    })

    return df

def resample_rpm(grid, df: pd.DataFrame):
    if len(df) < 2:
        raise ValueError("Need at least 2 samples for resampling rpm")

    relative_distance = df["relative_distance"].to_numpy()
    if not np.all(np.isfinite(relative_distance)):
        raise ValueError("Relative distance must be finite")

    rpm = df["rpm"].to_numpy(dtype=float, na_value=np.nan, copy=True)
    valid_rpm = np.isfinite(rpm) & (rpm >= 0)
    rpm[~valid_rpm] = np.nan

    if not np.all(np.diff(relative_distance) > 0):
        raise ValueError("Relative distances are not strictly increasing")

    # Not really necessary for now but its in case someone changes grid creation
    if grid.min() < relative_distance[0]:
        raise ValueError("Grid starts before source data")

    # Not really necessary for now but its in case someone changes grid creation
    if grid.max() > relative_distance[-1]:
        raise ValueError("Grid ends after source data")

    resampled_rpm = np.interp(grid, relative_distance, rpm)

    df = pd.DataFrame({
        "relative_distance": grid,
        "rpm": resampled_rpm
    })

    return df

def compare_laps(session_key: int, driver_a: int, driver_b: int) -> ComparisonResult:
    if driver_a == driver_b:
        raise SameDriverError("Pick two different drivers")

    cache_result = cache.get_comparison(session_key, driver_a, driver_b)
    if cache_result is not None:
        logger.info("cache_hit for session_key=%s, driver_a=%s, driver_b=%s", session_key, driver_a, driver_b)
        return cache_result

    logger.info("cache_miss for session_key=%s, driver_a=%s, driver_b=%s", session_key, driver_a, driver_b)
    drivers_fastest_lap: dict[int, Lap] = {}

    for number in [driver_a, driver_b]:
        laps = fetch_laps(session_key, number)
        fastest_lap = find_fastest_lap(laps)

        if fastest_lap is None:
            raise LapNotFoundError(f"Driver nr.{number} has not set fastest_lap")

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

    throttle_by_driver: dict[int, list[float | None] | None] = {
        driver_a: None,
        driver_b: None
    }

    brake_by_driver: dict[int, list[bool | None] | None] = {
        driver_a: None,
        driver_b: None
    }

    gear_by_driver: dict[int, list[int | None] | None] = {
        driver_a: None,
        driver_b: None
    }

    rpm_by_driver: dict[int, list[float | None] | None] = {
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
            resampled_throttle_df = resample_throttle(grid, telemetry_df)
            resampled_brake_df = resample_brake(grid, telemetry_df)
            resampled_gear_df = resample_gear(grid, telemetry_df)
            resampled_rpm_df = resample_rpm(grid, telemetry_df)

            throttle_values = []
            for throttle in resampled_throttle_df["throttle_percent"]:
                if np.isnan(throttle):
                    throttle_values.append(None)
                else:
                    throttle_values.append(float(throttle))

            brake_values = []
            for brake in resampled_brake_df["brake_on"]:
                if pd.isna(brake):
                    brake_values.append(None)
                else:
                    brake_values.append(bool(brake))

            gear_values = []
            for gear in resampled_gear_df["n_gear"]:
                if pd.isna(gear):
                    gear_values.append(None)
                else:
                    gear_values.append(int(gear))

            rpm_values = []
            for rpm in resampled_rpm_df["rpm"]:
                if np.isnan(rpm):
                    rpm_values.append(None)
                else:
                    rpm_values.append(float(rpm))

            speed_by_driver[driver] = resampled_speed_df["speed_kmh"].tolist()

            if all(value is None for value in throttle_values):
                throttle_by_driver[driver] = None
            else:
                throttle_by_driver[driver] = throttle_values

            if all(value is None for value in brake_values):
                brake_by_driver[driver] = None
            else:
                brake_by_driver[driver] = brake_values

            if all(value is None for value in gear_values):
                gear_by_driver[driver] = None
            else:
                gear_by_driver[driver] = gear_values

            if all(value is None for value in rpm_values):
                rpm_by_driver[driver] = None
            else:
                rpm_by_driver[driver] = rpm_values


    driver_a_data = DriverComparisonData(
        driver_number=driver_a,
        lap_number=driver_a_lap.lap_number,
        lap_time_s=driver_a_lap.lap_duration,
        sector_times_s=sector_times_a,
        speed_kmh=speed_by_driver[driver_a],
        throttle_percent=throttle_by_driver[driver_a],
        brake_on=brake_by_driver[driver_a],
        n_gear=gear_by_driver[driver_a],
        rpm=rpm_by_driver[driver_a]
    )

    driver_b_data = DriverComparisonData(
        driver_number=driver_b,
        lap_number=driver_b_lap.lap_number,
        lap_time_s=driver_b_lap.lap_duration,
        sector_times_s=sector_times_b,
        speed_kmh=speed_by_driver[driver_b],
        throttle_percent=throttle_by_driver[driver_b],
        brake_on=brake_by_driver[driver_b],
        n_gear=gear_by_driver[driver_b],
        rpm=rpm_by_driver[driver_b]
    )

    comparison_result = ComparisonResult(
        session_key=session_key,
        driver_a=driver_a_data,
        driver_b=driver_b_data,
        lap_delta_s=lap_delta_s,
        sector_deltas_s=sector_deltas_s,
        relative_distance=grid.tolist()
    )

    cache.save_comparison(comparison_result, 3600) # 1hour ttl

    return comparison_result


def main():
    drivers = {
        "Norris" : 4,
        "Piastri": 81
    }

    sessions = fetch_sessions(2024)

    print(f"Downloaded {len(sessions)} sessions")

    selected_session: Session | None = None
    for data in sessions:
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
