# Flyway with this repo's migrations built in, so it needs no volume mount.
# Rebuilt by `pnpm db:up` / `pnpm db:migrate`, so new migration files are picked up.
FROM flyway/flyway:11.20.3-alpine

COPY migrations /flyway/sql

ENV FLYWAY_LOCATIONS=filesystem:/flyway/sql \
    FLYWAY_CLEAN_DISABLED=true

CMD ["migrate"]
