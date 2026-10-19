import { Controller, Get, Param, Query } from '@nestjs/common';
import { Schema } from 'effect';
import { CatalogEntry, CatalogFilter, Path } from '@wisepath/domain/paths';
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
  list(@Query(new SchemaPipe(CatalogFilter)) filter: CatalogFilter) {
    return this.effect.respond(publications.listCatalog(filter), Schema.Array(CatalogEntry));
  }

  @Get(':slug')
  get(@Param('slug', new SchemaPipe(Schema.String)) slug: string) {
    return this.effect.respond(publications.readPublished(slug), Path);
  }
}
