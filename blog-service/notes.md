docker-compose build

docker exec -it tourism-postgres psql -U postgres

sudo -iu postgres
psql
\l # list databases
\c <dbname> # switch context to database
\dt # list tables
SELECT \* FROM table;

https://docs.docker.com/reference/dockerfile/
