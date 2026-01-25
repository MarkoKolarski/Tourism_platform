#!/bin/bash

# Extract the password from NEO4J_AUTH (format is neo4j/password)
PASSWORD=$(echo $NEO4J_AUTH | cut -d'/' -f2)

# Start the background waiter
(
  echo "Waiting for Neo4j to be ready..."
  until cypher-shell -u neo4j -p "$PASSWORD" "RETURN 1" >/dev/null 2>&1; do
    sleep 2
  done
  echo "Neo4j is up! Loading $1..."
  cypher-shell -u neo4j -p "$PASSWORD" -f "$1"
  echo "Cypher script execution finished."
) &

# Execute the original entrypoint
exec /startup/docker-entrypoint.sh neo4j