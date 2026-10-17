import { Controller, Get, Param } from '@nestjs/common';
import { Path, PathId } from '@wisepath/domain/paths';
import { EffectRuntime } from '../../shared/infrastructure/EffectRuntime';
import { SchemaPipe } from '../../shared/infrastructure/SchemaPipe';
import * as sharing from '../application/sharing';

/**
 * PublicPathsController
 * /api/public/paths as the contract (PublicPathsApiGroup) describes it: public maps, read without a session. It
 * only reads; no route here takes a body or changes anything.
 */
@Controller('public/paths')
export class PublicPathsController {
  constructor(private readonly effect: EffectRuntime) {}

  @Get(':pathId')
  get(@Param('pathId', new SchemaPipe(PathId)) id: PathId) {
    return this.effect.respond(sharing.readPublicPath(id), Path);
  }
}
