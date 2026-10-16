import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { Schema } from 'effect';
import { LinkPreview } from '@wisepath/domain/paths';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt.guard';
import { EffectRuntime } from '../../shared/infrastructure/EffectRuntime';
import { SchemaPipe } from '../../shared/infrastructure/SchemaPipe';
import { previewLink } from '../application/links';

const PreviewQuery = Schema.Struct({ url: Schema.String });

/**
 * LinksController
 * /api/link-preview as the contract (LinksApiGroup in @wisepath/contract)
 * describes it. Pages change rarely, so the browser may keep a preview a day.
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class LinksController {
  constructor(private readonly effect: EffectRuntime) {}

  @Get('link-preview')
  @Header('cache-control', 'private, max-age=86400')
  preview(@Query(new SchemaPipe(PreviewQuery)) query: typeof PreviewQuery.Type) {
    return this.effect.respond(previewLink(query.url), LinkPreview);
  }
}
