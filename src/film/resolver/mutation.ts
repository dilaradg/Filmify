// eslint-disable-next-line max-classes-per-file
import { UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { IsInt, IsNumberString, Min } from 'class-validator';
import { AuthGuard, Roles } from 'nest-keycloak-connect';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';
import { FilmDTO } from '../controller/film-dto.js';
import {
    FilmWriteService,
    FilmCreate,
    FilmUpdate,
} from '../service/film-write-service.js';
import { type IdInput } from './query.js';
import { HttpExceptionFilter } from './http-exception-filter.js';

export type CreatePayload = {
    readonly id: number;
};

export type UpdatePayload = {
    readonly version: number;
};

export type DeletePayload = {
    readonly success: boolean;
};

export class FilmUpdateDTO extends FilmDTO {
    @IsNumberString()
    readonly id!: string;

    @IsInt()
    @Min(0)
    readonly version!: number;
}

@Resolver('Film')
@UseGuards(AuthGuard)
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class FilmMutationResolver {
    readonly #service: FilmWriteService;

    readonly #logger = getLogger(FilmMutationResolver.name);

    constructor(service: FilmWriteService) {
        this.#service = service;
    }

    @Mutation()
    @Roles('admin', 'user')
    async create(@Args('input') filmDTO: FilmDTO) {
        this.#logger.debug('create: filmDTO=%o', filmDTO);

        const film = this.#filmDtoToFilmCreate(filmDTO);
        const id = await this.#service.create(film);
        this.#logger.debug('createFilm: id=%d', id);
        const payload: CreatePayload = { id };
        return payload;
    }

    @Mutation()
    @Roles('admin', 'user')
    async update(@Args('input') filmDTO: FilmUpdateDTO) {
        this.#logger.debug('update: film=%o', filmDTO);

        const film = this.#filmUpdateDtoToFilmUpdate(filmDTO);
        const versionStr = `"${filmDTO.version.toString()}"`;

        const versionResult = await this.#service.update({
            id: Number.parseInt(filmDTO.id, 10),
            film,
            version: versionStr,
        });
        this.#logger.debug('updateFilm: versionResult=%d', versionResult);
        const payload: UpdatePayload = { version: versionResult };
        return payload;
    }

    @Mutation()
    @Roles('admin')
    async delete(@Args() id: IdInput) {
        const idValue = id.id;
        this.#logger.debug('delete: idValue=%s', idValue);
        await this.#service.delete(Number(idValue));
        const payload: DeletePayload = { success: true };
        return payload;
    }

    #filmDtoToFilmCreate(filmDTO: FilmDTO): FilmCreate {
        const schauspieler = filmDTO.schauspieler?.map((schauspielerDTO) => {
            const schauspielerItem = {
                vorname: schauspielerDTO.vorname,
                nachname: schauspielerDTO.nachname,
                rolle: schauspielerDTO.rolle ?? null,
            };
            return schauspielerItem;
        });

        const film: FilmCreate = {
            version: 0,
            imdbId: filmDTO.imdbId,
            titel: filmDTO.titel,
            bewertung: filmDTO.bewertung,
            art: filmDTO.art ?? null,
            dauerMin: filmDTO.dauerMin ?? null,
            erscheinungsdatum: filmDTO.erscheinungsdatum ?? null,
            beschreibung: {
                create: {
                    beschreibung: filmDTO.beschreibung.beschreibung,
                },
            },
            schauspieler: { create: schauspieler ?? [] },
        };
        return film;
    }

    #filmUpdateDtoToFilmUpdate(filmDTO: FilmUpdateDTO): FilmUpdate {
        return {
            imdbId: filmDTO.imdbId,
            titel: filmDTO.titel,
            bewertung: filmDTO.bewertung,
            art: filmDTO.art ?? null,
            dauerMin: filmDTO.dauerMin ?? null,
            erscheinungsdatum: filmDTO.erscheinungsdatum ?? null,
        };
    }
}
