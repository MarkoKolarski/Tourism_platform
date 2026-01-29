#!/bin/bash
docker container prune
docker volume prune
docker volume rm tourism_platform_postgres_data
