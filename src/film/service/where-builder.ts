// Copyright (C) 2016 - present Juergen Zimmermann, Hochschule Karlsruhe
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

/**
 * Das Modul besteht aus der Klasse {@linkcode WhereBuilder}.
 * @packageDocumentation
 */

import { Injectable } from '@nestjs/common';
import { type FilmWhereInput } from '../../generated/prisma/models/Film.js';
import { Prisma, Filmart } from '../../generated/prisma/client.js';
import { getLogger } from '../../logger/logger.js';
import { type Suchparameter } from './suchparameter.js';

/** Typdefinitionen für die Suche mit der Film-ID. */
export type BuildIdParams = {
    /** ID des gesuchten Films. */
    readonly id: number;
    /** Sollen Beschreibung und Schauspieler mitgeladen werden? */
    readonly mitDetails?: boolean;
};

/**
 * Die Klasse `WhereBuilder` baut die WHERE-Klausel für DB-Anfragen mit _Prisma_.
 */
@Injectable()
export class WhereBuilder {
    readonly #logger = getLogger(WhereBuilder.name);

    /**
     * WHERE-Klausel für die flexible Suche nach Filmen bauen.
     * @param suchparameter JSON-Objekt mit Suchparameter. Bei "titel" wird mit
     * einem Teilstring gesucht, bei "bewertung" mit einem Mindestwert, bei "dauerMin"
     * mit der Obergrenze.
     * @returns FilmWhereInput
     */
    build(suchparameter: Suchparameter) {
        this.#logger.debug('build: suchparameter=%o', suchparameter);

        // Beispiel:
        // { titel: 'a', bewertung: 4, art: 'THRILLER' }
        // WHERE titel ILIKE %a% AND bewertung >= 4 AND art = 'THRILLER'

        let where: FilmWhereInput = {};

        // Properties vom Typ number, enum, boolean, Date
        // diverse Vergleiche, z.B. Gleichheit, <= (lte), >= (gte)
        Object.entries(suchparameter).forEach(([key, value]) => {
            switch (key) {
                case 'titel':
                    where.titel = {
                        // https://www.prisma.io/docs/orm/reference/prisma-client-reference#filter-conditions-and-operators
                        contains: value as string,
                        mode: Prisma.QueryMode.insensitive,
                    };
                    break;
                case 'imdbId':
                    where.imdbId = { equals: value as string };
                    break;
                case 'bewertung':
                    const bewertungNumber = parseInt(value as string);
                    if (!isNaN(bewertungNumber)) {
                        where.bewertung = { gte: bewertungNumber };
                    }
                    break;
                case 'dauerMin':
                    const dauerNumber = parseInt(value as string);
                    if (!isNaN(dauerNumber)) {
                        where.dauerMin = { lte: dauerNumber };
                    }
                    break;
                case 'art':
                    // enum
                    where.art = { equals: value as Filmart };
                    break;
                case 'erscheinungsdatum':
                    where.erscheinungsdatum = {
                        gte: new Date(value as string),
                    };
                    break;
            }
        });

        this.#logger.debug('build: where=%o', where);
        return where;
    }
}
