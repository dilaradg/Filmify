/* eslint-disable n/no-process-env */
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
// along with this program. If not, see <http://www.gnu.org/licenses/>.

// Aufruf:  pnpm i
//          pnpx prisma generate
//
//          node --env-file=.env src\beispiele.mts

import { PrismaPg } from '@prisma/adapter-pg';
import process from 'node:process';
import {
    PrismaClient,
    type Film,
    type Prisma,
} from './generated/prisma/client.ts';
import {
    type FilmInclude,
    type FilmWhereInput,
} from './generated/prisma/models/Film.ts';

console.log(`process.env['DATABASE_URL']=${process.env['DATABASE_URL']}`);
console.log('');

// Hilfsfunktion für formatierte Ausgabe
const printResult = (label: string, data: unknown) => {
    console.log('='.repeat(80));
    console.log(`${label}:`);
    console.log('-'.repeat(80));
    console.log(JSON.stringify(data, null, 2));
    console.log('='.repeat(80));
    console.log('');
};

// "named parameter" durch JSON-Objekt
const adapter = new PrismaPg({
    connectionString: process.env['DATABASE_URL'],
});

// union type
const log: (Prisma.LogLevel | Prisma.LogDefinition)[] = [
    {
        emit: 'event',
        level: 'query',
    },
    'info',
    'warn',
    'error',
];

// PrismaClient fuer DB "film" (siehe Umgebungsvariable DATABASE_URL in ".env")
// d.h. mit PostgreSQL-User "film" und Schema "film"
const prisma = new PrismaClient({
    // shorthand property
    adapter,
    errorFormat: 'pretty',
    log,
});

// SELECT *
// FROM   film
// WHERE  titel LIKE "%n%"
const where: FilmWhereInput = {
    titel: {
        contains: 'n',
    },
};

// Fetch-Joins mit Daten aus "beschreibung" und "schauspieler"
const includeBeschreibungSchauspieler: FilmInclude = {
    beschreibung: true,
    schauspieler: true,
};
export type FilmMitBeschreibungUndSchauspieler = Prisma.FilmGetPayload<{
    include: {
        beschreibung: true;
        schauspieler: true;
    };
}>;

// Operationen mit dem Model "Film"
try {
    await prisma.$connect();

    // Das Resultat ist null, falls kein Datensatz gefunden
    const film: Film | null = await prisma.film.findUnique({
        where: { id: 1000 },
    });
    printResult('Film mit ID=1000', film);

    // Fetch-Join mit Beschreibung und Schauspieler
    const filme: FilmMitBeschreibungUndSchauspieler[] = await prisma.film.findMany({
        // shorthand property
        where,
        include: includeBeschreibungSchauspieler,
    });
    printResult('Filme mit Schauspieler (Titel enthält "n")', filme);

    // union type
    const titel = filme.map((f) => f.titel);
    printResult('Extrahierte Titel', titel);

    // Pagination
    const filmePage1: Film[] = await prisma.film.findMany({
        skip: 0,
        take: 2,
    });
    printResult('Filme Seite 1 (skip=0, take=2)', filmePage1);
} finally {
    await prisma.$disconnect();
}

// PrismaClient mit PostgreSQL-User "postgres", d.h. mit Administrationsrechten
const adapterAdmin = new PrismaPg({
    connectionString: process.env['DATABASE_URL_ADMIN'],
});
const prismaAdmin = new PrismaClient({ adapter: adapterAdmin });
try {
    const filmeAdmin: Film[] = await prismaAdmin.film.findMany({ where });
    printResult('Filme (Admin-Zugriff)', filmeAdmin);
} finally {
    await prismaAdmin.$disconnect();
}

/* eslint-enable n/no-process-env */
