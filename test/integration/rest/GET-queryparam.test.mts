// Copyright (C) 2025 - present Juergen Zimmermann, Hochschule Karlsruhe
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

import { HttpStatus } from '@nestjs/common';
import { describe, expect, test } from 'vitest';
import { type Page } from '../../../src/film/controller/page.js';
import { CONTENT_TYPE, restURL } from '../constants.mjs';
import { Film } from '../../../src/generated/prisma/client.js';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const imdbIds = ['tt0449059', 'tt9362722', 'tt0068646'];
const bewertungMin = [4, 5];

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('GET /rest', () => {
    test.concurrent('Alle Filme', async () => {
        // given

        // when
        const response = await fetch(restURL);
        const { status, headers } = response;

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

        const body = (await response.json()) as Page<Film>;

        body.content
            .map((film) => film.id)
            .forEach((id) => {
                expect(id).toBeDefined();
            });
    });

    test.concurrent.each(imdbIds)(
        'Film mit IMDB-ID %s suchen',
        async (imdbId) => {
            // given
            const params = new URLSearchParams({ imdbId });
            const url = `${restURL}?${params}`;

            // when
            const response = await fetch(url);
            const { status, headers } = response;

            // then
            expect(status).toBe(HttpStatus.OK);
            expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

            const body = (await response.json()) as Page<Film>;

            expect(body).toBeDefined();

            // 1 Film mit der ISBN
            const filme = body.content;

            expect(filme).toHaveLength(1);

            const [film] = filme;
            const imdbIdFound = film?.imdbId;

            expect(imdbIdFound).toBe(imdbId);
        },
    );

    test.concurrent.each(bewertungMin)(
        'Filme mit Mindest-"bewertung" %i suchen',
        async (bewertung) => {
            // given
            const params = new URLSearchParams({
                bewertung: bewertung.toString(),
            });
            const url = `${restURL}?${params}`;

            // when
            const response = await fetch(url);
            const { status, headers } = response;

            // then
            expect(status).toBe(HttpStatus.OK);
            expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

            const body = (await response.json()) as Page<Film>;

            // Jedes Film hat eine Bewertung >= bewertung
            body.content
                .map((film) => film.bewertung)
                .forEach((r) => expect(r).toBeGreaterThanOrEqual(bewertung));
        },
    );
});
