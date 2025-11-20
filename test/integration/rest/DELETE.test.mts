import { HttpStatus } from '@nestjs/common';
import { beforeAll, describe, expect, test } from 'vitest';
import { AUTHORIZATION, BEARER, DELETE, restURL } from '../constants.mjs';
import { getToken } from '../token.mjs';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const id = '1010';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('DELETE /rest', () => {
    let token: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
    });

    test.concurrent('Vorhandenen Film loeschen', async () => {
        // given
        const url = `${restURL}/${id}`;
        const headers = new Headers();
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: DELETE,
            headers,
        });

        // then
        expect(status).toBe(HttpStatus.NO_CONTENT);
    });

    test.concurrent('Film loeschen, aber ohne Token', async () => {
        // given
        const url = `${restURL}/${id}`;

        // when
        const { status } = await fetch(url, { method: DELETE });

        // then
        expect(status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test.concurrent('Film loeschen, aber mit falschem Token', async () => {
        // given
        const url = `${restURL}/${id}`;
        const headers = new Headers();
        headers.append(AUTHORIZATION, `${BEARER} FALSCHER_TOKEN`);

        // when
        const { status } = await fetch(url, {
            method: DELETE,
            headers,
        });

        // then
        expect(status).toBe(HttpStatus.UNAUTHORIZED);
    });
});
