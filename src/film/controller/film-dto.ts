/**
 * Das Modul besteht aus der Entity-Klasse für Filme.
 * @packageDocumentation
 */

/* eslint-disable max-classes-per-file, @typescript-eslint/no-magic-numbers */

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayUnique,
    IsArray,
    IsISO8601,
    IsInt,
    IsOptional,
    Matches,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';
import { BeschreibungDTO } from './beschreibung-dto.js';
import { SchauspielerDTO } from './schauspieler-dto.js';
import { Filmart } from '../../generated/prisma/enums.js';

export const MAX_BEWERTUNG = 5;

/**
 * Entity-Klasse für Filme ohne Referenzen.
 */
export class FilmDtoOhneRef {
    // IMDb ID Format: tt + 7-8 Ziffern
    @Matches(/^tt\d{7,8}$/u)
    @ApiProperty({ example: 'tt0449059', type: String })
    readonly imdbId!: string;

    @MaxLength(100)
    @ApiProperty({ example: 'Little Miss Sunshine', type: String })
    readonly titel!: string;

    @IsInt()
    @Min(0)
    @Max(MAX_BEWERTUNG)
    @ApiProperty({ example: 5, type: Number })
    readonly bewertung!: number;

    @Matches(/^(ROMCOM|THRILLER|DRAMA|HORROR|ANIME|ANIMATION|ACTION|FANTASY|SCI_FI|MYSTERY|BIOGRAFIE)$/u)
    @IsOptional()
    @ApiProperty({ example: 'ROMCOM', type: String })
    readonly art: Filmart | undefined;

    @IsInt()
    @Min(1)
    @IsOptional()
    @ApiProperty({ example: 101, type: Number })
    readonly dauerMin: number | undefined;

    @IsISO8601({ strict: true })
    @IsOptional()
    @ApiProperty({ example: '2006-07-26' })
    readonly erscheinungsdatum: Date | string | undefined;
}

/**
 * Entity-Klasse für Filme.
 */
export class FilmDTO extends FilmDtoOhneRef {
    @ValidateNested()
    @Type(() => BeschreibungDTO)
    @ApiProperty({ type: BeschreibungDTO })
    readonly beschreibung!: BeschreibungDTO;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SchauspielerDTO)
    @ApiProperty({ type: [SchauspielerDTO] })
    readonly schauspieler: SchauspielerDTO[] | undefined;
}
/* eslint-enable max-classes-per-file, @typescript-eslint/no-magic-numbers */
