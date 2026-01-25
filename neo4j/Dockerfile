FROM neo4j:latest

# Copy the cypher script
COPY init_neo4j.cypher /var/lib/neo4j/import/init_neo4j.cypher

# Copy the entrypoint script
COPY entrypoint.sh /entrypoint.sh

# Ensure the script is executable
USER root
RUN chmod +x /entrypoint.sh
USER neo4j

# Run our custom entrypoint and pass the path to the cypher file as an argument
ENTRYPOINT ["/entrypoint.sh", "/var/lib/neo4j/import/init_neo4j.cypher"]