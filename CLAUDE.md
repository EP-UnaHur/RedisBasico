# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An educational ("EP" / *ejemplo práctico*) demo of the **cache-aside pattern** with Redis fronting a slow data source, built on Express. Code comments, logs, and the README are in Spanish. See `README.md` for the conceptual walkthrough (cache hit / cache miss / prime cache / TTL).

## Commands

```bash
# 1. Start Redis + RedisInsight (reads REDIS_PASSWORD from .env)
docker compose up -d
#    RedisInsight UI -> http://localhost:5540 ; Redis -> localhost:6379

# 2. Run the app with auto-reload
npm run dev          # nodemon src/app.js
```

There is no test suite (`npm test` is a stub that exits 1) and no linter configured.

A `.env` is committed (this is a throwaway demo). Variables: `PORT`, `REDIS_URL`, `REDIS_PASSWORD`, `CACHE_TTL_SEGUNDOS` (cache TTL, default 60), `DEMORA_QUERY_MS` (simulated slow-query delay, default 2000). `REDIS_PASSWORD` has no fallback in `redis.js`, so it must be set in `.env` for the client to authenticate against the password-protected Redis from `docker-compose.yml`.

## Architecture

Request flow for `GET /:id`, wired in `src/app.js`:

1. **`cacheMiddleware.checkCache`** (`src/redis.middleware.js`) runs first. It does `client.get(id)`; on a hit it responds `200` with the cached JSON and the route handler never runs (**cache hit**).
2. On a miss, the route handler calls `queryQueTarda(id)` — a `setTimeout`-based fake of a slow DB/service (`DEMORA_QUERY_MS`, default 2s) — then `redisClient.set(id, ..., { EX: CACHE_TTL_SEGUNDOS })` to **prime the cache** (default 60s TTL), and responds. Errors are forwarded via `next(err)` to a centralized error handler that returns `500`.
3. `DELETE /:id` runs `cacheMiddleware.deleteCache` (`client.del(id)`) to invalidate, then returns `204`.

Key points:
- **The Redis key is the route param `id`** (no namespacing). `GET /foo` caches under key `foo`.
- **`src/redis.js`** creates and exports a single shared `redisClient`. `app.listen`'s callback calls `redisClient.connect()` — connection happens at startup, after the server is already listening.
- **Cached values are JSON strings** — `set` does `JSON.stringify`, both read paths do `JSON.parse`.
- **`src/fakeData/data.js`** generates the "slow source" payload with `mgeneratejs` from the template `src/fakeData/template/fanclub.json` (faker-style `$name`/`$email`/`$choose` directives), spreading the requested `id` onto each generated record.

So to demo caching: hit `GET /<anything>` once (~2s, miss), again (instant, hit), then `DELETE /<same>` and the next GET is slow again.
