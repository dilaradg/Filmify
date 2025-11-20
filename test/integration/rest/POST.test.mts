import { HttpStatus } from '@nestjs/common';
import { describe, expect, test } from 'vitest';
import { type FilmDTO } from '../../../src/film/controller/film-dto.js';
import {
    APPLICATION_JSON,
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    POST,
    restURL,
} from '../constants.mjs';

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

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('POST /rest', () => {
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
