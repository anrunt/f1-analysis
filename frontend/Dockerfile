FROM node:24-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . ./

RUN npm run build

FROM caddy:2.11.4-alpine

COPY --from=build /app/dist/ /srv

COPY Caddyfile /etc/caddy/Caddyfile

RUN addgroup -S -g 10001 app \
    && adduser -S -D -H -u 10001 -G app app \
    && mkdir -p /data/caddy /config/caddy \
    && chown -R app:app /data /config \
    && chmod 700 /data/caddy /config/caddy

USER app:app
