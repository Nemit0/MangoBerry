#!/bin/bash
# run.sh

docker compose down

branch="main"

echo "Pulling from $branch"

git pull origin $branch

echo "Starting Container"

docker compose up --build -d
