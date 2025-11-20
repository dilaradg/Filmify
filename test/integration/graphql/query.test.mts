/* eslint-disable @typescript-eslint/no-non-null-assertion */
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

import { type GraphQLRequest } from '@apollo/server';
import { HttpStatus } from '@nestjs/common';
import { beforeAll, describe, expect, test } from 'vitest';
import {
    ACCEPT,
    APPLICATION_JSON,
    CONTENT_TYPE,
    GRAPHQL_RESPONSE_JSON,
    POST,
    graphqlURL,
} from '../constants.mjs';
import { type Prisma } from '../../../src/generated/prisma/client.js';

export type FilmDTO = Omit<
    Prisma.FilmGetPayload<{
        select: {
            id: true;
            version: true;
            imdbId: true;
            titel: true;
            bewertung: true;
            art: true;
            dauerMin: true;
            erscheinungsdatum: true;
        };
    }>,
    'aktualisiert' | 'erzeugt'
>;

type FilmSuccessType = { data: { film: FilmDTO }; errors?: undefined };

export type ErrorsType = {
    message: string;
    path: string[];
    extensions: { code: string };
}[];
type FilmErrorsType = { data: { film: null }; errors: ErrorsType };

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const ids = [1000, 1021];

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('GraphQL Queries', () => {
    let headers: Headers;

    beforeAll(() => {
        headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
    });

    test.concurrent.each(ids)('Film zu ID %i', async (id) => {
        // given
        const query: GraphQLRequest = {
            query: `
                {
                    film(id: "${id}") {
                        version
                        imdbId
                        bewertung
                        art
                        dauerMin
                        erscheinungsdatum
                        titel
                    }
                }
            `,
        };

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(query),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } = (await response.json()) as FilmSuccessType;

        expect(errors).toBeUndefined();
        expect(data).toBeDefined();

        const { film } = data;

        expect(film.titel).toMatch(/^\w/u);
        expect(film.version).toBeGreaterThan(-1);
        expect(film.id).toBeUndefined();
    });

    test.concurrent('Film zu nicht-vorhandener ID', async () => {
        // given
        const id = '999999';
        const query: GraphQLRequest = {
            query: `
                {
                    film(id: "${id}") {
                        titel
                    }
                }
            `,
        };

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(query),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } = (await response.json()) as FilmErrorsType;

        expect(data.film).toBeNull();
        expect(errors).toHaveLength(1);

        const [error] = errors;
        const { message, path, extensions } = error!;

        expect(message).toBe(`Es gibt keinen Film mit der ID ${id}.`);
        expect(path).toBeDefined();
        expect(path![0]).toBe('film');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });
});

/* eslint-enable @typescript-eslint/no-non-null-assertion */
