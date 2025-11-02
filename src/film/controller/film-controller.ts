/**
 * Das Modul besteht aus der Controller-Klasse für Lesen an der REST-Schnittstelle.
 * @packageDocumentation
 */

import {
    Controller,
    Get,
    HttpStatus,
    Req,
    Res,
    UseInterceptors,
} from '@nestjs/common';
import { type Request, type Response } from 'express';
import { Public } from 'nest-keycloak-connect';
import { paths } from '../../config/paths.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';
import { FilmService } from '../service/film-service.js';

/**
 * Die Controller-Klasse für die Verwaltung von Filmen.
 */
@Controller(paths.rest)
@UseInterceptors(ResponseTimeInterceptor)
export class FilmController {
    readonly #service: FilmService;
    readonly #logger = getLogger(FilmController.name);

    constructor(service: FilmService) {
        this.#service = service;
    }

    /**
     * Alle Filme werden asynchron gesucht.
     *
     * @param req Request-Objekt von Express.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Get()
    @Public()
    async getAll(@Req() req: Request, @Res() res: Response): Promise<Response> {
        this.#logger.debug('getAll');

        if (req.accepts(['json', 'html']) === false) {
            this.#logger.debug('getAll: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const filme = await this.#service.findAll();
        this.#logger.debug('getAll: filme=%o', filme);

        return res.json(filme);
    }
}
