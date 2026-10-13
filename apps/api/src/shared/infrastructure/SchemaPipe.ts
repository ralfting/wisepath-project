import { BadRequestException } from '@nestjs/common';
import type { PipeTransform } from '@nestjs/common';
import { Cause, Exit, Schema } from 'effect';
import { InvalidRequest } from '@wisepath/contract';

/**
 * Decodes a request's body, query or path parameter with a schema from the domain
 * or the contract, for any client. What doesn't match is answered with 400
 * and the contract's InvalidRequest body saying what was wrong.
 */
export class SchemaPipe<S extends Schema.Top & { readonly DecodingServices: never }>
  implements PipeTransform<unknown, S['Type']>
{
  constructor(private readonly schema: S) {}

  transform(value: unknown): S['Type'] {
    const result = Schema.decodeUnknownExit(this.schema)(value, { onExcessProperty: 'error' });
    if (Exit.isSuccess(result)) return result.value;

    const error = Cause.squash(result.cause);
    const message = error instanceof Error ? error.message : String(error);
    throw new BadRequestException(Schema.encodeSync(InvalidRequest)(new InvalidRequest({ message })));
  }
}
