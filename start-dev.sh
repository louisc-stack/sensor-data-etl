#!/usr/bin/env bash
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

echo "Starting MySQL..."
docker compose --profile=development up -d database

echo "Run the program..."
docker compose --profile=development run --rm server