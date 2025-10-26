/**
 * Das Modul besteht aus der Controller-Klasse für Schreiben an der REST-Schnittstelle.
 * @packageDocumentation
 */

import {
    Body,
    Controller,
    Delete,
    Headers,
    HttpStatus,
    Param,
    Post,
    Put,
    Res,
} from '@nestjs/common';
import { type Response } from 'express';
import { paths } from '../../config/paths.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';
import {
    type FilmCreate,
    type UpdateParams,
    FilmWriteService,
} from '../service/film-write-service.js';

/**
 * Die Controller-Klasse für die Verwaltung von Filmen (Schreiboperationen).
 */
@Controller(paths.rest)
@UseInterceptors(ResponseTimeInterceptor)
export class FilmWriteController {
    readonly #service: FilmWriteService;
    readonly #logger = getLogger(FilmWriteController.name);

    constructor(service: FilmWriteService) {
        this.#service = service;
    }

    /**
     * Ein neuer Film wird asynchron angelegt.
     *
     * @param film Film-Daten im Body des Request-Objekts.
     * @param res Leeres Response-Objekt von Express.
     * @returns Response mit Statuscode 201 und der ID des neu angelegten Films
     *          oder Statuscode 400, falls die IMDB-ID bereits existiert.
     */
    @Post()
    async create(
        @Body() film: FilmCreate,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug('create: film=%o', film);

        const id = await this.#service.create(film);
        this.#logger.debug('create: id=%d', id);

        const location = `${paths.rest}/${id}`;
        return res.location(location).status(HttpStatus.CREATED).json({ id });
    }

    /**
     * Ein vorhandener Film wird asynchron aktualisiert.
     *
     * @param film Film-Daten im Body des Request-Objekts.
     * @param id Pfad-Parameter für die ID.
     * @param version Versionsnummer aus dem Header If-Match.
     * @param res Leeres Response-Objekt von Express.
     * @returns Response mit Statuscode 204 oder Statuscode 400, 404 oder 412.
     */
    @Put(':id')
    async update(
        @Body() film: FilmCreate,
        @Param('id') id: string,
        @Headers('If-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug(
            'update: id=%s, film=%o, version=%s',
            id,
            film,
            version,
        );

        if (version === undefined) {
            const msg = 'Header "If-Match" fehlt';
            this.#logger.debug('update: %s', msg);
            return res
                .status(HttpStatus.PRECONDITION_REQUIRED)
                .set('Content-Type', 'text/plain')
                .send(msg);
        }

        const updateParams: UpdateParams = {
            id: Number(id),
            film,
            version,
        };
        const newVersion = await this.#service.update(updateParams);
        this.#logger.debug('update: newVersion=%d', newVersion);

        return res
            .status(HttpStatus.NO_CONTENT)
            .set('ETag', `"${newVersion}"`)
            .send();
    }

    /**
     * Ein Film wird anhand seiner ID gelöscht.
     *
     * @param id Pfad-Parameter für die ID.
     * @param res Leeres Response-Objekt von Express.
     * @returns Response mit Statuscode 204 oder Statuscode 404.
     */
    @Delete(':id')
    async delete(
        @Param('id') id: string,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug('delete: id=%s', id);

        await this.#service.delete(Number(id));
        this.#logger.debug('delete: erfolgreich');

        return res.sendStatus(HttpStatus.NO_CONTENT);
    }
}
