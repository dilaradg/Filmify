-- Copyright (C) 2022 - present Juergen Zimmermann, Hochschule Karlsruhe
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
--
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
-- GNU General Public License for more details.
--
-- You should have received a copy of the GNU General Public License
-- along with this program.  If not, see <https://www.gnu.org/licenses/>.

-- Aufruf:
-- docker compose exec db bash
-- psql --dbname=film --username=film --file=/sql/create-table.sql

-- text statt varchar(n):
-- "There is no performance difference among these three types, apart from a few extra CPU cycles
-- to check the length when storing into a length-constrained column"
-- ggf. CHECK(char_length(nachname) <= 255)

-- Indexe auflisten:
-- psql --dbname=film --username=film
--  SELECT   tablename, indexname, indexdef, tablespace
--  FROM     pg_indexes
--  WHERE    schemaname = 'film'
--  ORDER BY tablename, indexname;
--  \q

-- https://www.postgresql.org/docs/current/manage-ag-tablespaces.html
SET default_tablespace = filmspace;

-- https://www.postgresql.org/docs/current/app-psql.html
-- https://www.postgresql.org/docs/current/ddl-schemas.html
-- https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-CREATE
-- "user-private schema" (Default-Schema: public)
CREATE SCHEMA IF NOT EXISTS AUTHORIZATION film;

ALTER ROLE film SET search_path = 'film';
set search_path to 'film';

-- https://www.postgresql.org/docs/current/sql-createtype.html
-- https://www.postgresql.org/docs/current/datatype-enum.html
CREATE TYPE filmart AS ENUM ('ROMCOM', 'THRILLER', 'DRAMA', 'HORROR', 'ANIME', 'ANIMATION', 'ACTION', 'FANTASY', 'SCIFI', 'MYSTERY', 'BIOGRAFIE');

-- https://www.postgresql.org/docs/current/sql-createtable.html
-- https://www.postgresql.org/docs/current/datatype.html
CREATE TABLE IF NOT EXISTS film (
                  -- https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
                  -- https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-PRIMARY-KEYS
                  -- impliziter Index fuer Primary Key
                  -- "GENERATED ALWAYS AS IDENTITY" gemaess SQL-Standard
                  -- entspricht SERIAL mit generierter Sequenz  film_id_seq
    id            integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
                  -- https://www.postgresql.org/docs/current/ddl-constraints.html#id-1.5.4.6.6
    version       integer NOT NULL DEFAULT 0,
                  -- impliziter Index als B-Baum durch UNIQUE
                  -- https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS
    imdb_id       text NOT NULL UNIQUE,
    titel         text NOT NULL,
                  -- https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS
                  -- https://www.postgresql.org/docs/current/functions-matching.html#FUNCTIONS-POSIX-REGEXP
    bewertung        integer NOT NULL CHECK (bewertung >= 0 AND bewertung <= 5),
    art           filmart,
                  -- https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-NUMERIC-DECIMAL
    dauer_min   integer CHECK (dauer_min > 0), 
    erscheinungsdatum  date,
                  -- https://www.postgresql.org/docs/current/datatype-datetime.html
    erzeugt       timestamp NOT NULL DEFAULT NOW(),
    aktualisiert  timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS beschreibung (
    id              integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    beschreibung    text NOT NULL,
                    -- https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK
    film_id         integer NOT NULL UNIQUE REFERENCES film ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS schauspieler (
    id              integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    vorname         text NOT NULL,
    nachname        text NOT NULL,
    rolle           text,
    film_id         integer NOT NULL REFERENCES film ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS schauspieler_film_id_idx ON schauspieler(film_id);

CREATE TABLE IF NOT EXISTS film_file (
    id              integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    data            bytea NOT NULL,
    filename        text NOT NULL,
    mimetype        text,
    film_id         integer NOT NULL UNIQUE REFERENCES film ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS film_file_film_id_idx ON film_file(film_id);