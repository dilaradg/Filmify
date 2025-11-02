/**
 * Das Modul besteht aus der Entity-Klasse für Beschreibung.
 * @packageDocumentation
 */

/* eslint-disable @typescript-eslint/no-magic-numbers */

import { ApiProperty } from '@nestjs/swagger';
import { Matches, MaxLength } from 'class-validator';

/**
 * Entity-Klasse für Beschreibung.
 */
export class BeschreibungDTO {
    @Matches(String.raw`^\w.*`)
    @MaxLength(1000)
    @ApiProperty({
        example: 'Eine fesselnde Geschichte über...',
        type: String,
    })
    readonly beschreibung!: string;
}
/* eslint-enable @typescript-eslint/no-magic-numbers */
