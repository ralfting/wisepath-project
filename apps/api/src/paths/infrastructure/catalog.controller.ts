import { Controller, Get, Param } from '@nestjs/common';
import { Schema } from 'effect';
import { CatalogEntry, Path } from '@wisepath/domain/paths';
import { EffectRuntime } from '../../shared/infrastructure/EffectRuntime';
import { SchemaPipe } from '../../shared/infrastructure/SchemaPipe';
import * as publications from '../application/publications';

/**
 * CatalogController
 * /api/public/catalog as the contract (CatalogApiGroup) describes it: published maps by their address, read without
 * a session. It only reads.
 */
@Controller('public/catalog')
export class CatalogController {
  constructor(private readonly effect: EffectRuntime) {}

  @Get()
  list() {
    return this.effect.respond(publications.listCatalog(), Schema.Array(CatalogEntry));
  }

  @Get(':slug')
  get(@Param('slug', new SchemaPipe(Schema.String)) slug: string) {
    return this.effect.respond(publications.readPublished(slug), Path);
  }
}
