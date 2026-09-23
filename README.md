# F1 Analysis

Narzędzie do porównywania okrążeń kierowców F1 na podstawie danych OpenF1.

## Struktura repozytorium

- `backend/` — API FastAPI oraz pobieranie, walidacja i analiza danych w Pythonie.
- Frontend React/TypeScript jest planowany jako osobny katalog `frontend/` obok backendu; nie został jeszcze utworzony.

## Uruchomienie backendu

Wymagania: [uv](https://docs.astral.sh/uv/) oraz Python 3.12 lub nowszy. Plik `backend/.python-version` wskazuje wersję 3.12 dla lokalnego środowiska.

Z głównego katalogu repozytorium:

```bash
cd backend
uv sync --locked
uv run uvicorn api:app --reload
```

Dokumentacja API: <http://127.0.0.1:8000/docs>.

Więcej informacji: [backend/README.md](backend/README.md).
