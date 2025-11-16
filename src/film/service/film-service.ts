// Copyright (C) 2016 - present Juergen Zimmermann, Hochschule Karlsruhe
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

/**
 * Das Modul besteht aus der Klasse {@linkcode FilmService}.
 * @packageDocumentation
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { getLogger } from '../../logger/logger.js';
import { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { type FilmInclude } from '../../generated/prisma/models/Film.js';
import { PrismaService } from './prisma-service.js';
import { type Pageable } from './pageable.js';
import { type Suchparameter } from './suchparameter.js';
import { type Slice } from './slice.js';

// Typdefinition für `findById`
type FindByIdParams = {
    // ID des gesuchten Films
    readonly id: number;
    /** Sollen Beschreibung und Schauspieler mitgeladen werden? */
    readonly mitDetails?: boolean;
};

export type FilmMitBeschreibung = Prisma.FilmGetPayload<{
    include: { beschreibung: true };
}>;

export type FilmMitBeschreibungUndSchauspieler = Prisma.FilmGetPayload<{
    include: {
        beschreibung: true;
        schauspieler: true;
    };
}>;

export type FilmSlice = {
    readonly content: readonly FilmMitBeschreibung[];
    readonly totalElements: number;
};

/**
 * Die Klasse `FilmService` implementiert das Lesen für Filme und greift
 * mit _Prisma_ auf eine relationale DB zu.
 */
@Injectable()
export class FilmService {
    static readonly ID_PATTERN = /^[1-9]\d{0,10}$/u;

    readonly #prisma: PrismaClient;
    readonly #includeBeschreibung: FilmInclude = { beschreibung: true };
    readonly #includeBeschreibungUndSchauspieler: FilmInclude = {
        beschreibung: true,
        schauspieler: true,
    };

    readonly #logger = getLogger(FilmService.name);

    constructor(prisma: PrismaService) {
        this.#prisma = prisma.client;
    }

    /**
     * Ein Film asynchron anhand seiner ID suchen
     * @param id ID des gesuchten Films
     * @returns Das gefundene Film in einem Promise aus ES2015.
     * @throws NotFoundException falls kein Film mit der ID existiert
     */
    async findById({
        id,
        mitDetails = false,
    }: FindByIdParams): Promise<Readonly<FilmMitBeschreibungUndSchauspieler>> {
        this.#logger.debug('findById: id=%d', id);

        // Das Resultat ist null, falls kein Datensatz gefunden
        // Lesen: Keine Transaktion erforderlich
        const include = mitDetails
            ? this.#includeBeschreibungUndSchauspieler
            : this.#includeBeschreibung;
        const film: FilmMitBeschreibungUndSchauspieler | null =
            await this.#prisma.film.findUnique({
                where: { id },
                include,
            });
        if (film === null) {
            this.#logger.debug('Es gibt keinen Film mit der ID %d', id);
            throw new NotFoundException(
                `Es gibt keinen Film mit der ID ${id}.`,
            );
        }

        this.#logger.debug('findById: film=%o', film);
        return film;
    }

    /**
     * Alle Filme asynchron suchen.
     * @returns Ein JSON-Array mit allen Filmen.
     * @throws NotFoundException falls keine Filme gefunden wurden.
     */
    async findAll(): Promise<readonly FilmMitBeschreibung[]> {
        this.#logger.debug('findAll');

        const filme: FilmMitBeschreibung[] = await this.#prisma.film.findMany({
            include: this.#includeBeschreibung,
        });

        if (filme.length === 0) {
            this.#logger.debug('findAll: Keine Filme gefunden');
            throw new NotFoundException('Keine Filme gefunden');
        }

        this.#logger.debug('findAll: %d Filme gefunden', filme.length);
        return filme;
    }

      /**
     * Filme mit Suchkriterien und Pagination suchen
     * @param suchparameter Suchkriterien
     * @param pageable Pagination-Informationen
     * @returns Paginierte Liste von Filmen
     */
    async find(
        suchparameter: Suchparameter,
        pageable: Pageable,
    ): Promise<Slice<FilmMitBeschreibung>> {
        this.#logger.debug(
            'find: suchparameter=%o, pageable=%o',
            suchparameter,
            pageable,
        );

        // Where-Bedingung aufbauen basierend auf Suchparametern
        const where = this.#buildWhereCondition(suchparameter);

        // Gesamtanzahl der Filme mit den Suchkriterien
        const totalElements = await this.#prisma.film.count({ where });

        // Berechne skip und take aus pageable
        const skip = pageable.number * pageable.size;
        const take = pageable.size;

        // Paginierte Filme abrufen
        const filme: FilmMitBeschreibung[] = await this.#prisma.film.findMany({
            where,
            include: this.#includeBeschreibung,
            skip,
            take,
            orderBy: { id: 'asc' }, // Standard-Sortierung nach ID
        });

        this.#logger.debug(
            'find: %d von %d Filmen gefunden',
            filme.length,
            totalElements,
        );

        return {
            content: filme,
            totalElements,
        };
    }

    /**
     * Anzahl aller Filme ermitteln
     * @returns Anzahl der Filme
     */
    async count(): Promise<number> {
        this.#logger.debug('count');
        const anzahl = await this.#prisma.film.count();
        this.#logger.debug('count: %d', anzahl);
        return anzahl;
    }

    /**
     * Baut die WHERE-Bedingung für Prisma basierend auf Suchparametern auf
     */
    #buildWhereCondition(suchparameter: Suchparameter): Prisma.FilmWhereInput {
        const where: Prisma.FilmWhereInput = {};

        // Suche nach IMDB-ID (exakt)
        if (suchparameter.imdbId !== undefined) {
            where.imdbId = suchparameter.imdbId;
        }

        // Suche nach Titel (enthält, case-insensitive)
        if (suchparameter.titel !== undefined) {
            where.titel = {
                contains: suchparameter.titel,
                mode: 'insensitive',
            };
        }

        // Suche nach Bewertung (exakt oder größer/kleiner)
        if (suchparameter.bewertung !== undefined) {
            const bewertung = typeof suchparameter.bewertung === 'string'
                ? Number(suchparameter.bewertung)
                : suchparameter.bewertung;
            where.bewertung = bewertung;
        }

        // Suche nach Art (exakt)
        if (suchparameter.art !== undefined) {
            where.art = suchparameter.art;
        }

        // Suche nach Dauer in Minuten
        if (suchparameter.dauerMin !== undefined) {
            where.dauerMin = suchparameter.dauerMin;
        }

        // Suche nach Erscheinungsdatum
        if (suchparameter.erscheinungsdatum !== undefined) {
            // Konvertiere String zu Date
            const datum = new Date(suchparameter.erscheinungsdatum);
            where.erscheinungsdatum = datum;
        }

        this.#logger.debug('#buildWhereCondition: where=%o', where);
        return where;
    }
}
