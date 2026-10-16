import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Effect, Schema } from 'effect';
import {
  NewPage,
  NewPath,
  Page,
  PageEdit,
  PageId,
  Path,
  PathEdit,
  PathId,
  PathSummary,
} from '@wisepath/domain/paths';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt.guard';
import { EffectRuntime } from '../../shared/infrastructure/EffectRuntime';
import { SchemaPipe } from '../../shared/infrastructure/SchemaPipe';
import { CurrentUser } from '../application/CurrentUser';
import * as paths from '../application/paths';

/**
 * PathsController
 * /api/paths as the contract (PathsApiGroup in @wisepath/contract)
 * describes it. Nest routes the request and checks the session; the schema
 * pipes decode what came in, and the use case does the rest in Effect.
 */

/** Runs as the session's user, whom the guard put on the request */
const asUser = (req: Request) => Effect.provideService(CurrentUser, { id: req.user!.id });

const pathId = new SchemaPipe(PathId);
const pageId = new SchemaPipe(PageId);

@Controller('paths')
@UseGuards(JwtAuthGuard)
export class PathsController {
  constructor(private readonly effect: EffectRuntime) {}

  @Get()
  list(@Req() req: Request) {
    return this.effect.respond(paths.listPaths().pipe(asUser(req)), Schema.Array(PathSummary));
  }

  @Post()
  create(@Req() req: Request, @Body(new SchemaPipe(NewPath)) command: NewPath) {
    return this.effect.respond(paths.createPath(command).pipe(asUser(req)), Path);
  }

  @Get(':pathId')
  get(@Req() req: Request, @Param('pathId', pathId) id: PathId) {
    return this.effect.respond(paths.getPath(id).pipe(asUser(req)), Path);
  }

  @Patch(':pathId')
  @HttpCode(204)
  async update(
    @Req() req: Request,
    @Param('pathId', pathId) id: PathId,
    @Body(new SchemaPipe(PathEdit)) edit: PathEdit,
  ) {
    await this.effect.run(paths.updatePath(id, edit).pipe(asUser(req)));
  }

  @Delete(':pathId')
  @HttpCode(204)
  async remove(@Req() req: Request, @Param('pathId', pathId) id: PathId) {
    await this.effect.run(paths.removePath(id).pipe(asUser(req)));
  }

  @Post(':pathId/pages')
  createPage(
    @Req() req: Request,
    @Param('pathId', pathId) id: PathId,
    @Body(new SchemaPipe(NewPage)) command: NewPage,
  ) {
    return this.effect.respond(paths.createPage(id, command).pipe(asUser(req)), Page);
  }

  @Patch(':pathId/pages/:pageId')
  @HttpCode(204)
  async updatePage(
    @Req() req: Request,
    @Param('pathId', pathId) id: PathId,
    @Param('pageId', pageId) page: PageId,
    @Body(new SchemaPipe(PageEdit)) edit: PageEdit,
  ) {
    await this.effect.run(paths.updatePage(id, page, edit).pipe(asUser(req)));
  }

  @Delete(':pathId/pages/:pageId')
  @HttpCode(204)
  async removePage(
    @Req() req: Request,
    @Param('pathId', pathId) id: PathId,
    @Param('pageId', pageId) page: PageId,
  ) {
    await this.effect.run(paths.deletePage(id, page).pipe(asUser(req)));
  }
}
