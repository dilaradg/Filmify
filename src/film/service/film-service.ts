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
import { type Film, PrismaClient } from '../../generated/prisma/client.js';
import { PrismaService } from './prisma-service.js';

/**
 * Die Klasse `FilmService` implementiert das Lesen für Filme und greift
 * mit _Prisma_ auf eine relationale DB zu.
 */
@Injectable()
export class FilmService {
    readonly #prisma: PrismaClient;
    readonly #logger = getLogger(FilmService.name);

    constructor(prisma: PrismaService) {
        this.#prisma = prisma.client;
    }

    /**
     * Filme asynchron suchen.
     * @returns Ein JSON-Array mit den gefundenen Filmen.
     * @throws NotFoundException falls keine Filme gefunden wurden.
     */
    async findAll(): Promise<readonly Film[]> {
        this.#logger.debug('findAll');

        const filme: Film[] = await this.#prisma.film.findMany();

        if (filme.length === 0) {
            this.#logger.debug('findAll: Keine Filme gefunden');
            throw new NotFoundException('Keine Filme gefunden');
        }

        this.#logger.debug('findAll: %d Filme gefunden', filme.length);
        return filme;
    }
}
