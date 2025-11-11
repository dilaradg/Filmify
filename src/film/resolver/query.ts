// Copyright (C) 2021 - present Juergen Zimmermann, Hochschule Karlsruhe
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

import { UseFilters, UseInterceptors } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Public } from 'nest-keycloak-connect';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';
import {
    FilmService,
    type FilmMitBeschreibung,
    type FilmMitBeschreibungUndSchauspieler,
} from '../service/film-service.js';
import { HttpExceptionFilter } from './http-exception-filter.js';

export type IdInput = {
    readonly id: string;
};

@Resolver('Film')
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class FilmQueryResolver {
    readonly #service: FilmService;

    readonly #logger = getLogger(FilmQueryResolver.name);

    constructor(service: FilmService) {
        this.#service = service;
    }

    @Query('film')
    @Public()
    async findById(
        @Args() { id }: IdInput,
    ): Promise<Readonly<FilmMitBeschreibungUndSchauspieler>> {
        this.#logger.debug('findById: id=%s', id);

        const film: Readonly<FilmMitBeschreibungUndSchauspieler> =
            await this.#service.findById({ id: Number(id) });

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'findById: film=%s, beschreibung=%s',
                film.toString(),
                JSON.stringify(film.beschreibung),
            );
        }
        return film;
    }

    @Query('filme')
    @Public()
    async find(): Promise<FilmMitBeschreibung[]> {
        this.#logger.debug('find: alle Filme');

        const filme: readonly FilmMitBeschreibung[] =
            await this.#service.findAll();

        this.#logger.debug('find: filme=%o', filme);
        return filme as FilmMitBeschreibung[];
    }
}
