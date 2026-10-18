import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
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
  ShareResult,
  SharedWith,
  PathSummary,
  PublicationRequest,
  ShareEdit,
  VisibilityEdit,
} from '@wisepath/domain/paths';
import { UserId } from '@wisepath/domain/auth';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt.guard';
import { EffectRuntime } from '../../shared/infrastructure/EffectRuntime';
import { SchemaPipe } from '../../shared/infrastructure/SchemaPipe';
import { CurrentUser } from '../application/CurrentUser';
import * as downloads from '../application/downloads';
import * as paths from '../application/paths';
import * as publications from '../application/publications';
import * as sample from '../application/sample';
import * as sharing from '../application/sharing';
import { requestLocale } from '../../projects/infrastructure/requestLocale';
import { markdownZip } from './markdownZip';

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
const userId = new SchemaPipe(UserId);

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

  @Post('sample')
  takeSample(@Req() req: Request) {
    return this.effect.respond(sample.takeSample(requestLocale(req)).pipe(asUser(req)), Path);
  }

  // Before ':pathId', so "export" is never read as a path id
  @Get('export')
  async exportAll(@Req() req: Request) {
    return markdownZip(await this.effect.run(downloads.exportAll().pipe(asUser(req))), 'WisePath');
  }

  @Get(':pathId/export')
  async export(@Req() req: Request, @Param('pathId', pathId) id: PathId) {
    const { name, files } = await this.effect.run(downloads.exportPath(id).pipe(asUser(req)));
    return markdownZip(files, name);
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

  @Get(':pathId/shares')
  shares(@Req() req: Request, @Param('pathId', pathId) id: PathId) {
    return this.effect.respond(sharing.listShares(id).pipe(asUser(req)), SharedWith);
  }

  @Put(':pathId/shares')
  share(@Req() req: Request, @Param('pathId', pathId) id: PathId, @Body(new SchemaPipe(ShareEdit)) edit: ShareEdit) {
    return this.effect.respond(sharing.sharePath(id, edit).pipe(asUser(req)), ShareResult);
  }

  @Delete(':pathId/invites')
  @HttpCode(204)
  async cancelInvite(@Req() req: Request, @Param('pathId', pathId) id: PathId, @Query('email', new SchemaPipe(Schema.String)) email: string) {
    await this.effect.run(sharing.cancelInvite(id, email).pipe(asUser(req)));
  }

  @Delete(':pathId/shares/:userId')
  @HttpCode(204)
  async unshare(@Req() req: Request, @Param('pathId', pathId) id: PathId, @Param('userId', userId) member: UserId) {
    await this.effect.run(sharing.unsharePath(id, member).pipe(asUser(req)));
  }

  @Delete(':pathId/membership')
  @HttpCode(204)
  async leave(@Req() req: Request, @Param('pathId', pathId) id: PathId) {
    await this.effect.run(sharing.leavePath(id).pipe(asUser(req)));
  }

  @Patch(':pathId/visibility')
  @HttpCode(204)
  async setVisibility(
    @Req() req: Request,
    @Param('pathId', pathId) id: PathId,
    @Body(new SchemaPipe(VisibilityEdit)) edit: VisibilityEdit,
  ) {
    await this.effect.run(sharing.setVisibility(id, edit).pipe(asUser(req)));
  }

  @Post(':pathId/take')
  @HttpCode(204)
  async take(@Req() req: Request, @Param('pathId', pathId) id: PathId) {
    await this.effect.run(sharing.takePath(id).pipe(asUser(req)));
  }

  @Put(':pathId/publication')
  @HttpCode(204)
  async requestPublication(
    @Req() req: Request,
    @Param('pathId', pathId) id: PathId,
    @Body(new SchemaPipe(PublicationRequest)) request: PublicationRequest,
  ) {
    await this.effect.run(publications.askToPublish(id, request).pipe(asUser(req)));
  }

  @Delete(':pathId/publication')
  @HttpCode(204)
  async withdrawPublication(@Req() req: Request, @Param('pathId', pathId) id: PathId) {
    await this.effect.run(publications.withdrawPublication(id).pipe(asUser(req)));
  }
}
