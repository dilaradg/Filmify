// Copyright (C) 2024 - present Juergen Zimmermann
//
// GNU GPL ... (gleiche Lizenz wie bei deinem Prof)

import http from 'k6/http';
// @ts-expect-error https://github.com/grafana/k6-jslib-testing
import { expect } from 'https://jslib.k6.io/k6-testing/0.5.0/index.js';
import { sleep } from 'k6';
import { type Options } from 'k6/options';
// @ts-expect-error type stripping für k6
import { FilmDTO } from '../../src/film/controller/film-dto.ts';
import { generateImdbId } from './imdbId_generate.js';

//
// Basis-URLs
//
const baseUrl = 'https://localhost:3000';
const restUrl = `${baseUrl}/rest`;
const tokenUrl = `${baseUrl}/auth/token`;
const dbPopulateUrl = `${baseUrl}/dev/db_populate`;

//
// Testdaten
//
const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const titelArray = ['a', 'b', 'c', 'd', 'e'];

const neuerFilm: FilmDTO = {
    imdbId: 'TBD',
    titel: 'Lasttest-Film',
    bewertung: 5,
    art: 'ACTION',
    dauerMin: 120,
    erscheinungsdatum: '2025-02-28',

    beschreibung: {
        beschreibung: 'Beschreibung aus k6',
    },

    schauspieler: [
        {
            vorname: 'Max',
            nachname: 'Power',
            rolle: 'Hauptrolle',
        },
    ],
};

//
// TLS
//
const tlsDir = '../../src/config/resources/tls';
const cert = open(`${tlsDir}/certificate.crt`);
const key = open(`${tlsDir}/key.pem`);

//
// Setup Phase
//
export function setup() {
    //
    // Token holen
    //
    const tokenHeaders: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };
    const body = 'username=admin&password=p';

    const tokenResponse = http.post<'text'>(tokenUrl, body, {
        headers: tokenHeaders,
    });

    let token: string;
    if (tokenResponse.status === 200) {
        token = JSON.parse(tokenResponse.body).access_token;
        console.log(`token=${token}`);
    } else {
        throw new Error(
            `Token holen fehlgeschlagen: status=${tokenResponse.status}`,
        );
    }

    //
    // DB neu laden
    //
    const headers = { Authorization: `Bearer ${token}` };
    const res = http.post(dbPopulateUrl, undefined, { headers });

    if (res.status === 200) {
        console.log('DB neu geladen');
    } else {
        throw new Error(
            `setup db_populate fehlgeschlagen: status=${res.status}, body=${res.body}`,
        );
    }
}

//
// K6 Szenarien
//
const rampUpDuration = '5s';
const steadyDuration = '22s';
const rampDownDuration = '3s';

export const options: Options = {
    batchPerHost: 50,

    scenarios: {
        get_id: {
            exec: 'getById',
            executor: 'ramping-vus',
            stages: [
                { target: 2, duration: rampUpDuration },
                { target: 2, duration: steadyDuration },
                { target: 0, duration: rampDownDuration },
            ],
        },
        get_id_not_modified: {
            exec: 'getByIdNotModified',
            executor: 'ramping-vus',
            stages: [
                { target: 5, duration: rampUpDuration },
                { target: 5, duration: steadyDuration },
                { target: 0, duration: rampDownDuration },
            ],
        },
        get_titel: {
            exec: 'getByTitel',
            executor: 'ramping-vus',
            stages: [
                { target: 20, duration: rampUpDuration },
                { target: 20, duration: steadyDuration },
                { target: 0, duration: rampDownDuration },
            ],
        },
        get_imdbId: {
            exec: 'getByImdbId',
            executor: 'ramping-vus',
            stages: [
                { target: 10, duration: rampUpDuration },
                { target: 10, duration: steadyDuration },
                { target: 0, duration: rampDownDuration },
            ],
        },
        post_film: {
            exec: 'postFilm',
            executor: 'ramping-vus',
            stages: [
                { target: 3, duration: rampUpDuration },
                { target: 3, duration: steadyDuration },
                { target: 0, duration: rampDownDuration },
            ],
        },
    },

    tlsAuth: [
        {
            cert,
            key,
        },
    ],
    tlsVersion: http.TLS_1_3,
    insecureSkipTLSVerify: true,
};

//
// Szenario-Implementierungen
//

// GET /rest/<id>
export function getById() {
    const id = ids[Math.floor(Math.random() * ids.length)];
    const response = http.get(`${restUrl}/${id}`);

    expect(response.status).toBe(200);
    expect(response.headers['Content-Type']).toContain('application/json');
    sleep(1);
}

// GET /rest/<id> mit If-None-Match
export function getByIdNotModified() {
    const id = ids[Math.floor(Math.random() * ids.length)];
    const headers = { 'If-None-Match': '"0"' };

    const response = http.get(`${restUrl}/${id}`, { headers });

    expect(response.status).toBe(304);
    sleep(1);
}

// GET /rest?titel=<value>
export function getByTitel() {
    const titel = titelArray[Math.floor(Math.random() * titelArray.length)];

    const response = http.get(`${restUrl}?titel=${titel}`);

    expect(response.status).toBe(200);
    expect(response.headers['Content-Type']).toContain('application/json');
    sleep(1);
}

// GET /rest?imdbId=<value>
export function getByImdbId() {
    const imdbId = generateImdbId();
    const response = http.get(`${restUrl}?imdbId=${imdbId}`);

    // Wird evtl. 404 → Fehlerfrei im Lasttest
    expect([200, 404]).toContain(response.status);
    sleep(1);
}

// POST /rest (Film erstellen)
export function postFilm() {
    const film = { ...neuerFilm };
    film.imdbId = generateImdbId();

    //
    // Token holen
    //
    const tokenHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };
    const login = 'username=admin&password=p';
    const tokenResponse = http.post<'text'>(tokenUrl, login, {
        headers: tokenHeaders,
    });

    expect(tokenResponse.status).toBe(200);

    const token = JSON.parse(tokenResponse.body).access_token;

    //
    // POST senden
    //
    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const response = http.post(restUrl, JSON.stringify(film), { headers });

    expect(response.status).toBe(201);
    expect(response.headers['Location']).toContain(restUrl);

    sleep(1);
}
