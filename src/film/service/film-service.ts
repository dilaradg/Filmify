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
}
