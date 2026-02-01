FROM postgres:15

# Copy initialization scripts in correct order
COPY init-db.sql /docker-entrypoint-initdb.d/01-init-db.sql

# Ensure scripts are executable
RUN chmod +x /docker-entrypoint-initdb.d/*.sql

# Set environment to ensure initialization runs
ENV POSTGRES_INITDB_ARGS="--encoding=UTF-8 --lc-collate=en_US.UTF-8 --lc-ctype=en_US.UTF-8"
