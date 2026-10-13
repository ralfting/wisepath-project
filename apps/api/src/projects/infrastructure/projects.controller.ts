import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Effect, Schema } from 'effect';
import {
  NewPage,
  NewProject,
  Page,
  PageEdit,
  PageId,
  Project,
  ProjectEdit,
  ProjectId,
  ProjectSummary,
} from '@wisepath/domain/projects';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt.guard';
import { EffectRuntime } from '../../shared/infrastructure/EffectRuntime';
import { SchemaPipe } from '../../shared/infrastructure/SchemaPipe';
import { CurrentUser } from '../application/CurrentUser';
import * as projects from '../application/projects';

/**
 * ProjectsController
 * /api/projects as the contract (ProjectsApiGroup in @wisepath/contract)
 * describes it. Nest routes the request and checks the session; the schema
 * pipes decode what came in, and the use case does the rest in Effect.
 */

/** Runs as the session's user, whom the guard put on the request */
const asUser = (req: Request) => Effect.provideService(CurrentUser, { id: req.user!.id });

const projectId = new SchemaPipe(ProjectId);
const pageId = new SchemaPipe(PageId);

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly effect: EffectRuntime) {}

  @Get()
  list(@Req() req: Request) {
    return this.effect.respond(projects.listProjects().pipe(asUser(req)), Schema.Array(ProjectSummary));
  }

  @Post()
  create(@Req() req: Request, @Body(new SchemaPipe(NewProject)) command: NewProject) {
    return this.effect.respond(projects.createProject(command).pipe(asUser(req)), Project);
  }

  @Get(':projectId')
  get(@Req() req: Request, @Param('projectId', projectId) id: ProjectId) {
    return this.effect.respond(projects.getProject(id).pipe(asUser(req)), Project);
  }

  @Patch(':projectId')
  @HttpCode(204)
  async update(
    @Req() req: Request,
    @Param('projectId', projectId) id: ProjectId,
    @Body(new SchemaPipe(ProjectEdit)) edit: ProjectEdit,
  ) {
    await this.effect.run(projects.updateProject(id, edit).pipe(asUser(req)));
  }

  @Delete(':projectId')
  @HttpCode(204)
  async remove(@Req() req: Request, @Param('projectId', projectId) id: ProjectId) {
    await this.effect.run(projects.removeProject(id).pipe(asUser(req)));
  }

  @Post(':projectId/pages')
  createPage(
    @Req() req: Request,
    @Param('projectId', projectId) id: ProjectId,
    @Body(new SchemaPipe(NewPage)) command: NewPage,
  ) {
    return this.effect.respond(projects.createPage(id, command).pipe(asUser(req)), Page);
  }

  @Patch(':projectId/pages/:pageId')
  @HttpCode(204)
  async updatePage(
    @Req() req: Request,
    @Param('projectId', projectId) id: ProjectId,
    @Param('pageId', pageId) page: PageId,
    @Body(new SchemaPipe(PageEdit)) edit: PageEdit,
  ) {
    await this.effect.run(projects.updatePage(id, page, edit).pipe(asUser(req)));
  }

  @Delete(':projectId/pages/:pageId')
  @HttpCode(204)
  async removePage(
    @Req() req: Request,
    @Param('projectId', projectId) id: ProjectId,
    @Param('pageId', pageId) page: PageId,
  ) {
    await this.effect.run(projects.deletePage(id, page).pipe(asUser(req)));
  }
}
