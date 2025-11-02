/**
 * Das Modul besteht aus der Entity-Klasse für Schauspieler.
 * @packageDocumentation
 */

/* eslint-disable @typescript-eslint/no-magic-numbers */

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, MaxLength } from 'class-validator';

/**
 * Entity-Klasse für Schauspieler.
 */
export class SchauspielerDTO {
    @MaxLength(40)
    @ApiProperty({ example: 'Tom', type: String })
    readonly vorname!: string;

    @MaxLength(40)
    @ApiProperty({ example: 'Hanks', type: String })
    readonly nachname!: string;

    @IsOptional()
    @MaxLength(60)
    @ApiProperty({ example: 'Forrest Gump', type: String })
    readonly rolle: string | undefined;
}
/* eslint-enable @typescript-eslint/no-magic-numbers */
