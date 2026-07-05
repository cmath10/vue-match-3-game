#!/usr/bin/env bash

RUNNING_CONTAINER_ID="$(docker ps -qf "ancestor=vue-match-3-game-node")"

# @TODO: Нужно добиться запуска контейнера в detach режиме и подключение к нему отдельно, останов отдельно
if [[ -z "${RUNNING_CONTAINER_ID}" ]]
then
    docker-compose run --rm node bash
else
    echo "Connecting to container ${RUNNING_CONTAINER_ID}..."
    docker exec -it --user hostuser ${RUNNING_CONTAINER_ID} bash
fi
