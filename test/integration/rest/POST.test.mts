import { HttpStatus } from '@nestjs/common';
import { beforeAll, describe, expect, test } from 'vitest';
import { type FilmDTO } from '../../../src/film/controller/film-dto.js';
import { FilmService } from '../../../src/film/service/film-service.js';
import {
    APPLICATION_JSON,
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    LOCATION,
    POST,
    restURL,
} from '../constants.mjs';
import { getToken } from '../token.mjs';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const neuerFilm: FilmDTO = {
    imdbId: 'tt1234567',
    titel: 'Test Film',
    bewertung: 5,
    art: 'DRAMA',
    dauerMin: 120,
    erscheinungsdatum: '2024-01-15T00:00:00Z',
    beschreibung: {
        beschreibung:
            'Eine spannende Geschichte über Freundschaft und Abenteuer.',
    },
    schauspieler: [
        {
            vorname: 'Tom',
            nachname: 'Hanks',
            rolle: 'Hauptrolle',
        },
        {
            vorname: 'Meryl',
            nachname: 'Streep',
            rolle: 'Nebenrolle',
        },
    ],
};

const neuerFilmInvalid: Record<string, unknown> = {
    imdbId: 'falsche-imdb-id',
    titel: '',
    bewertung: -1,
    art: 'UNSICHTBAR',
    dauerMin: -50,
    erscheinungsdatum: '12345-123-123',
    beschreibung: {
        beschreibung: '',
    },
};

const neuerFilmImdbIdExistiert: FilmDTO = {
    imdbId: 'tt0449059',
    titel: 'Duplicate Film',
    bewertung: 4,
    art: 'ROMCOM',
    dauerMin: 100,
    erscheinungsdatum: '2024-02-20T00:00:00Z',
    beschreibung: {
        beschreibung: 'Ein Film mit bereits existierender IMDB-ID.',
    },
    schauspieler: [],
};

type MessageType = { message: string };

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('POST /rest', () => {
    let token: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
    });

    test('Neuer Film', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neuerFilm),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.CREATED);

        const responseHeaders = response.headers;
        const location = responseHeaders.get(LOCATION);

        expect(location).toBeDefined();

        // ID nach dem letzten "/"
        const indexLastSlash = location?.lastIndexOf('/') ?? -1;

        expect(indexLastSlash).not.toBe(-1);

        const idStr = location?.slice(indexLastSlash + 1);

        expect(idStr).toBeDefined();
        expect(FilmService.ID_PATTERN.test(idStr ?? '')).toBe(true);
    });

    test.concurrent('Neuer Film mit ungueltigen Daten', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        const expectedMsg = [
            expect.stringMatching(/^imdbId /u),
            expect.stringMatching(/^titel /u),
            expect.stringMatching(/^bewertung /u),
            expect.stringMatching(/^art /u),
            expect.stringMatching(/^dauerMin /u),
            expect.stringMatching(/^erscheinungsdatum /u),
            expect.stringMatching(/^beschreibung.beschreibung /u),
        ];

        // when
        const response = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neuerFilmInvalid),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.BAD_REQUEST);

        const body = (await response.json()) as MessageType;
        const messages = body.message;

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toStrictEqual(expect.arrayContaining(expectedMsg));
    });

    test.concurrent(
        'Neuer Film, aber die IMDB-ID existiert bereits',
        async () => {
            // given
            const headers = new Headers();
            headers.append(CONTENT_TYPE, APPLICATION_JSON);
            headers.append(AUTHORIZATION, `${BEARER} ${token}`);

            // when
            const response = await fetch(restURL, {
                method: POST,
                body: JSON.stringify(neuerFilmImdbIdExistiert),
                headers,
            });

            // then
            const { status } = response;

            expect(status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);

            const body = (await response.json()) as MessageType;

            expect(body.message).toStrictEqual(
                expect.stringContaining('IMDB-ID'),
            );
        },
    );

    test.concurrent('Neuer Film, aber ohne Token', async () => {
        // when
        const { status } = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neuerFilm),
        });

        // then
        expect(status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test.concurrent('Neuer Film, aber mit falschem Token', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} FALSCHER_TOKEN`);

        // when
        const { status } = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neuerFilm),
            headers,
        });

        // then
        expect(status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test.concurrent.todo('Abgelaufener Token');
});
