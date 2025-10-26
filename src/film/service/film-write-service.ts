/**
 * Das Modul besteht aus der Klasse {@linkcode FilmWriteService} für die
 * Schreiboperationen im Anwendungskern.
 * @packageDocumentation
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { getLogger } from '../../logger/logger.js';
import {
    ImdbIdExistsException,
    VersionInvalidException,
    VersionOutdatedException,
} from './exceptions.js';
import { FilmService } from './film-service.js';
import { PrismaService } from './prisma-service.js';

export type FilmCreate = Prisma.FilmCreateInput;
type FilmCreated = Prisma.FilmGetPayload<{
    include: {
        beschreibung: true;
        schauspieler: true;
    };
}>;

export type FilmUpdate = Prisma.FilmUpdateInput;
/** Typdefinitionen zum Aktualisieren eines Films mit `update`. */
export type UpdateParams = {
    /** ID des zu aktualisierenden Films. */
    readonly id: number | undefined;
    /** Film-Objekt mit den aktualisierten Werten. */
    readonly film: FilmUpdate;
    /** Versionsnummer für die zu aktualisierenden Werte. */
    readonly version: string;
};
type FilmUpdated = Prisma.FilmGetPayload<{}>;

@Injectable()
export class FilmWriteService {
    private static readonly VERSION_PATTERN = /^"\d{1,3}"/u;

    readonly #prisma: PrismaClient;

    readonly #readService: FilmService;

    readonly #logger = getLogger(FilmWriteService.name);

    constructor(prisma: PrismaService, readService: FilmService) {
        this.#prisma = prisma.client;
        this.#readService = readService;
    }

    /**
     * Ein neuer Film soll angelegt werden.
     * @param film Der neu abzulegende Film
     * @returns Die ID des neu angelegten Films
     * @throws ImdbIdExistsException falls die IMDB-ID bereits existiert
     */
    async create(film: FilmCreate) {
        this.#logger.debug('create: film=%o', film);
        await this.#validateCreate(film);

        // Neuer Datensatz mit generierter ID
        let filmDb: FilmCreated | undefined;
        await this.#prisma.$transaction(async (tx) => {
            filmDb = await tx.film.create({
                data: film,
                include: { beschreibung: true, schauspieler: true },
            });
        });

        this.#logger.debug('create: filmDb.id=%s', filmDb?.id ?? 'N/A');
        return filmDb?.id ?? NaN;
    }

    /**
     * Ein vorhandener Film soll aktualisiert werden. "Destructured" Argument
     * mit id (ID des zu aktualisierenden Films), film (zu aktualisierender Film)
     * und version (Versionsnummer für optimistische Synchronisation).
     * @returns Die neue Versionsnummer gemäß optimistischer Synchronisation
     * @throws NotFoundException falls kein Film zur ID vorhanden ist
     * @throws VersionInvalidException falls die Versionsnummer ungültig ist
     * @throws VersionOutdatedException falls die Versionsnummer veraltet ist
     */
    // https://2ality.com/2015/01/es6-destructuring.html#simulating-named-parameters-in-javascript
    async update({ id, film, version }: UpdateParams) {
        this.#logger.debug(
            'update: id=%d, film=%o, version=%s',
            id ?? NaN,
            film,
            version,
        );
        if (id === undefined) {
            this.#logger.debug('update: Keine gueltige ID');
            throw new NotFoundException(
                `Es gibt keinen Film mit der ID ${id}.`,
            );
        }

        await this.#validateUpdate(id, version);

        film.version = { increment: 1 };
        let filmUpdated: FilmUpdated | undefined;
        await this.#prisma.$transaction(async (tx) => {
            filmUpdated = await tx.film.update({
                data: film,
                where: { id },
            });
        });
        this.#logger.debug(
            'update: filmUpdated=%s',
            JSON.stringify(filmUpdated),
        );

        return filmUpdated?.version ?? NaN;
    }

    /**
     * Ein Film wird asynchron anhand seiner ID gelöscht.
     *
     * @param id ID des zu löschenden Films
     * @returns true, falls der Film vorhanden war und gelöscht wurde. Sonst false.
     */
    async delete(id: number) {
        this.#logger.debug('delete: id=%d', id);

        await this.#prisma.$transaction(async (tx) => {
            await tx.film.delete({ where: { id } });
        });

        this.#logger.debug('delete');
    }

    async #validateCreate({
        imdbId,
    }: Prisma.FilmCreateInput): Promise<undefined> {
        this.#logger.debug('#validateCreate: imdbId=%s', imdbId ?? 'undefined');
        if (imdbId === undefined) {
            this.#logger.debug('#validateCreate: ok');
            return;
        }

        const anzahl = await this.#prisma.film.count({ where: { imdbId } });
        if (anzahl > 0) {
            this.#logger.debug('#validateCreate: imdbId existiert: %s', imdbId);
            throw new ImdbIdExistsException(imdbId);
        }
        this.#logger.debug('#validateCreate: ok');
    }

    async #validateUpdate(id: number, versionStr: string) {
        this.#logger.debug(
            '#validateUpdate: id=%d, versionStr=%s',
            id,
            versionStr,
        );
        if (!FilmWriteService.VERSION_PATTERN.test(versionStr)) {
            throw new VersionInvalidException(versionStr);
        }

        const version = Number.parseInt(versionStr.slice(1, -1), 10);
        const filmDb = await this.#readService.findById({ id });

        if (version < filmDb.version) {
            this.#logger.debug('#validateUpdate: versionDb=%d', version);
            throw new VersionOutdatedException(version);
        }
    }
}
