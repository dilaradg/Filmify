/* eslint-disable @typescript-eslint/no-non-null-assertion*/
import { HttpStatus } from '@nestjs/common';
import { beforeAll, describe, expect, test } from 'vitest';
import {
    ACCEPT,
    APPLICATION_JSON,
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    GRAPHQL_RESPONSE_JSON,
    POST,
    graphqlURL,
} from '../constants.mjs';
import { type GraphQLQuery } from './graphql.mjs';
import { ErrorsType } from './query.test.mjs';
import { getToken } from './token.mjs';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const idLoeschen = '1012';

type CreateSuccessType = {
    data: { create: { id: string } };
    errors?: undefined;
};
type CreateErrorsType = { data: { create: null }; errors: ErrorsType };

type UpdateSuccessType = {
    data: { update: { version: number } };
    errors?: undefined;
};
type UpdateErrorsType = { data: { update: null }; errors: ErrorsType };

type DeleteSuccessType = {
    data: { delete: { success: boolean } };
    errors?: undefined;
};
type DeleteErrorsType = { data: { delete: null }; errors: ErrorsType };

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('GraphQL Mutations', () => {
    let token: string;
    let tokenUser: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
        tokenUser = await getToken('user', 'p');
    });

    // -------------------------------------------------------------------------
    test('Neuer Film', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                            imdbId: "tt7654321",
                            titel: "GraphQL Test Film",
                            bewertung: 5,
                            art: DRAMA,
                            dauerMin: 130,
                            erscheinungsdatum: "2024-03-15T00:00:00Z",
                            beschreibung: {
                                beschreibung: "Ein spannender Film für GraphQL Tests."
                            },
                            schauspieler: [
                                {
                                    vorname: "Leonardo",
                                    nachname: "DiCaprio",
                                    rolle: "Hauptrolle"
                                },
                                {
                                    vorname: "Kate",
                                    nachname: "Winslet",
                                    rolle: "Nebenrolle"
                                }
                            ]
                        }
                    ) {
                        id
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data } = (await response.json()) as CreateSuccessType;

        expect(data).toBeDefined();

        const { create } = data;

        // Der Wert der Mutation ist die generierte ID
        expect(create).toBeDefined();

        const { id } = create;

        expect(parseInt(id, 10)).toBeGreaterThan(0);
    });

    // -------------------------------------------------------------------------
    test('Film mit ungueltigen Werten neu anlegen', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                            imdbId: "falsche-imdb-id",
                            titel: "",
                            bewertung: -1,
                            art: DRAMA,
                            dauerMin: -50,
                            erscheinungsdatum: "12345-123-123",
                            beschreibung: {
                                beschreibung: ""
                            }
                        }
                    ) {
                        id
                    }
                }
            `,
        };
        const expectedMsg = [
            expect.stringMatching(/^imdbId /u),
            expect.stringMatching(/^titel /u),
            expect.stringMatching(/^bewertung /u),
            expect.stringMatching(/^dauerMin /u),
            expect.stringMatching(/^erscheinungsdatum /u),
            expect.stringMatching(/^beschreibung.beschreibung /u),
        ];
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } = (await response.json()) as CreateErrorsType;

        expect(data.create).toBeNull();
        expect(errors).toHaveLength(1);

        const [error] = errors;

        expect(error).toBeDefined();

        const { message } = error!;
        const messages: string[] = message.split(',');

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toStrictEqual(expect.arrayContaining(expectedMsg));
    });

    // -------------------------------------------------------------------------
    test('Film aktualisieren', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "1000",
                            version: 0,
                            imdbId: "tt0449059",
                            titel: "Little Miss Sunshine - Updated",
                            bewertung: 4,
                            art: ROMCOM,
                            dauerMin: 105,
                            erscheinungsdatum: "2006-08-01T00:00:00Z"
                        }
                    ) {
                        version
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } = (await response.json()) as UpdateSuccessType;

        expect(errors).toBeUndefined();

        const { update } = data;

        // Der Wert der Mutation ist die neue Versionsnummer
        expect(update.version).toBe(1);
    });

    // -------------------------------------------------------------------------
    test('Film mit ungueltigen Werten aktualisieren', async () => {
        // given
        const id = '1000';
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "${id}",
                            version: 0,
                            imdbId: "falsche-imdb-id",
                            titel: "",
                            bewertung: -1,
                            art: DRAMA,
                            dauerMin: -50,
                            erscheinungsdatum: "12345-123-123"
                        }
                    ) {
                        version
                    }
                }
            `,
        };
        const expectedMsg = [
            expect.stringMatching(/^imdbId /u),
            expect.stringMatching(/^titel /u),
            expect.stringMatching(/^bewertung /u),
            expect.stringMatching(/^dauerMin /u),
            expect.stringMatching(/^erscheinungsdatum /u),
        ];
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } = (await response.json()) as UpdateErrorsType;

        expect(data.update).toBeNull();
        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message } = error!;
        const messages: string[] = message.split(',');

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toStrictEqual(expect.arrayContaining(expectedMsg));
    });

    // -------------------------------------------------------------------------
    test('Nicht-vorhandenen Film aktualisieren', async () => {
        // given
        const id = '999999';
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "${id}",
                            version: 0,
                            imdbId: "tt9999999",
                            titel: "Nicht existierender Film",
                            bewertung: 3,
                            art: ACTION,
                            dauerMin: 90,
                            erscheinungsdatum: "2024-01-01T00:00:00Z"
                        }
                    ) {
                        version
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } = (await response.json()) as UpdateErrorsType;

        expect(data.update).toBeNull();
        expect(errors).toHaveLength(1);

        const [error] = errors!;

        expect(error).toBeDefined();

        const { message, path, extensions } = error!;

        expect(message).toBe(
            `Es gibt keinen Film mit der ID ${id.toLowerCase()}.`,
        );
        expect(path).toBeDefined();
        expect(path![0]).toBe('update');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    // -------------------------------------------------------------------------
    test('Film loeschen', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    delete(id: "${idLoeschen}") {
                        success
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } = (await response.json()) as DeleteSuccessType;

        expect(errors).toBeUndefined();
        // Der Wert der Mutation ist true (falls geloescht wurde) oder false
        expect(data.delete.success).toBe(true);
    });

    // -------------------------------------------------------------------------
    test('Film loeschen als "user"', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    delete(id: "${idLoeschen}") {
                        success
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${tokenUser}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } = (await response.json()) as DeleteErrorsType;

        expect(data.delete).toBeNull();

        const [error] = errors!;

        expect(error).toBeDefined();

        const { message, extensions } = error!;

        expect(message).toBe('Forbidden resource');
        expect(extensions.code).toBe('BAD_USER_INPUT');
    });
});
/* eslint-enable @typescript-eslint/no-non-null-assertion */
