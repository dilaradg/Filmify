// Copyright ...

import http from 'k6/http';
// @ts-expect-error k6 testing library
import { expect } from 'https://jslib.k6.io/k6-testing/0.5.0/index.js';
import { sleep } from 'k6';
import { type Options } from 'k6/options';

// @ts-expect-error type stripping
import { FilmDTO } from '../../src/film/controller/film-dto.ts';

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
// Setup: Token holen + DB neu laden
//
export function setup() {
    const tokenHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };

    const body = 'username=admin&password=p';
    const tokenResponse = http.post<'text'>(tokenUrl, body, { headers: tokenHeaders });

    if (tokenResponse.status !== 200) {
        throw new Error(`Token holen fehlgeschlagen: ${tokenResponse.status}`);
    }

    const token = JSON.parse(tokenResponse.body).access_token;
    console.log(`token=${token}`);

    //
    // DB neu laden
    //
    const res = http.post(dbPopulateUrl, undefined, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status !== 200) {
        throw new Error(`db_populate fehlgeschlagen: status=${res.status}, body=${res.body}`);
    }

    console.log('DB neu geladen');
}

//
// K6 Szenarien
//
const rampUp = '5s';
const steady = '22s';
const rampDown = '3s';

export const options: Options = {
    batchPerHost: 50,

    scenarios: {
        get_id: {
            exec: 'getById',
            executor: 'ramping-vus',
            stages: [
                { target: 2, duration: rampUp },
                { target: 2, duration: steady },
                { target: 0, duration: rampDown },
            ],
        },
        get_id_not_modified: {
            exec: 'getByIdNotModified',
            executor: 'ramping-vus',
            stages: [
                { target: 5, duration: rampUp },
                { target: 5, duration: steady },
                { target: 0, duration: rampDown },
            ],
        },
        get_titel: {
            exec: 'getByTitel',
            executor: 'ramping-vus',
            stages: [
                { target: 20, duration: rampUp },
                { target: 20, duration: steady },
                { target: 0, duration: rampDown },
            ],
        },
        get_imdbId: {
            exec: 'getByImdbId',
            executor: 'ramping-vus',
            stages: [
                { target: 10, duration: rampUp },
                { target: 10, duration: steady },
                { target: 0, duration: rampDown },
            ],
        },
        post_film: {
            exec: 'postFilm',
            executor: 'ramping-vus',
            stages: [
                { target: 3, duration: rampUp },
                { target: 3, duration: steady },
                { target: 0, duration: rampDown },
            ],
        },
    },

    tlsAuth: [{ cert, key }],
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

    // 200 → gefunden, 404 → existiert nicht → okay in Lasttests
    expect([200, 404]).toContain(response.status);

    if (response.status === 200) {
        expect(response.headers['Content-Type']).toContain('application/json');
    }

    sleep(1);
}

// GET /rest/<id> mit If-None-Match
export function getByIdNotModified() {
    const id = ids[Math.floor(Math.random() * ids.length)];
    const headers = { 'If-None-Match': '"0"' };

    const response = http.get(`${restUrl}/${id}`, { headers });

    // bei HEAD/Cache-Szenarien ist 304 korrekt
    expect([304, 404]).toContain(response.status);

    sleep(1);
}

// GET /rest?titel=<value>
export function getByTitel() {
    const titel = titelArray[Math.floor(Math.random() * titelArray.length)];
    const response = http.get(`${restUrl}?titel=${titel}`);

    expect([200, 404]).toContain(response.status);

    if (response.status === 200) {
        expect(response.headers['Content-Type']).toContain('application/json');
    }

    sleep(1);
}

// GET /rest?imdbId=<value>
export function getByImdbId() {
    const imdbId = generateImdbId();
    const response = http.get(`${restUrl}?imdbId=${imdbId}`);

    expect([200, 404]).toContain(response.status);
    sleep(1);
}

// POST /rest (Film erstellen)
export function postFilm() {
    const film = { ...neuerFilm };
    film.imdbId = generateImdbId();

    // Token holen
    const tokenResponse = http.post<'text'>(
        tokenUrl,
        'username=admin&password=p',
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    expect([200]).toContain(tokenResponse.status);

    const token = JSON.parse(tokenResponse.body).access_token;

    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const response = http.post(restUrl, JSON.stringify(film), { headers });

    expect([201, 400, 409, 500]).toContain(response.status);

    sleep(1);
}

// ---------------------------------------------------------
// Hilfsfunktion: IMDb-ID generieren
// ---------------------------------------------------------
export function generateImdbId(): string {
    const prefix = 'tt';
    const number = String(Math.floor(Math.random() * 10_000_000)).padStart(7, '0');
    return `${prefix}${number}`;
}
