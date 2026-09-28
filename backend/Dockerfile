FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.8.22 /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN uv sync --locked --no-dev --no-install-project

COPY . ./

RUN groupadd app --gid 10001 && useradd app --uid 10001 --gid 10001 --no-create-home && mkdir -p /app/data && chown app:app /app/data

USER app:app

CMD ["/app/.venv/bin/uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
