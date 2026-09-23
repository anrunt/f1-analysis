# Backend F1 Analysis

Backend FastAPI pobiera dane z OpenF1 i porównuje wybrane najszybsze dostępne okrążenia dwóch kierowców. Wynik zawiera czasy okrążeń, czasy sektorów, delty A − B oraz przebiegi prędkości na wspólnej osi znormalizowanego dystansu.

## Uruchomienie API

Poniższe polecenia wykonuj z katalogu `backend/`:

```bash
uv sync --locked
uv run uvicorn api:app --reload
```

Dokumentacja interaktywna: <http://127.0.0.1:8000/docs>.

Przykładowe porównanie Norris–Piastri z kwalifikacji na Monzy w 2024 roku:

```text
GET /compare?session_id=9586&driver_a=4&driver_b=81
```

Analiza pobiera dane z OpenF1 i wymaga połączenia z internetem.

## Uruchomienie skryptu CLI

Z tego samego katalogu:

```bash
uv run main.py
```

Skrypt wybiera kwalifikacje na Monzy w 2024 roku i porównuje Norrisa z Piastrim.

## Ograniczenia analizy

Dystans jest szacowany z prędkości i normalizowany osobno dla każdego przebiegu. Wyrównanie telemetrii jest przybliżone; nie gwarantuje identycznej pozycji na torze. Wybór najszybszego dostępnego okrążenia nie potwierdza jego oficjalnej ważności.
