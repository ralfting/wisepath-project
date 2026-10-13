import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Schema } from 'effect';
import { UserId } from '@wisepath/domain/auth';
import { NewPage, NewProject, Page, PageEdit, PageId, Project, ProjectEdit, ProjectId, ProjectSummary } from '@wisepath/domain/projects';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt.guard';
import * as projects from '../application/projects';
import { EffectRuntime } from './EffectRuntime';
import { SchemaPipe } from './SchemaPipe';

/**
 * ProjectsController
 * /api/projects as the contract (ProjectsApiGroup in @wisepath/contract)
 * describes it. Nest routes the request and checks the session; the schema
 * pipes decode what came in, and the use case does the rest in Effect.
 */

/** The session guard puts the token's user on the request */
const userOf = (req: Request) => ({ id: UserId.make((req.user as { id: string }).id) });

const projectId = new SchemaPipe(ProjectId);
const pageId = new SchemaPipe(PageId);

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly effect: EffectRuntime) {}

  @Get()
  list(@Req() req: Request) {
    return this.effect.run(projects.listProjects(), userOf(req), Schema.Array(ProjectSummary));
  }

  @Post()
  create(@Req() req: Request, @Body(new SchemaPipe(NewProject)) command: NewProject) {
    return this.effect.run(projects.createProject(command), userOf(req), Project);
  }

  @Get(':projectId')
  get(@Req() req: Request, @Param('projectId', projectId) id: ProjectId) {
    return this.effect.run(projects.getProject(id), userOf(req), Project);
  }

  @Patch(':projectId')
  @HttpCode(204)
  async update(@Req() req: Request, @Param('projectId', projectId) id: ProjectId, @Body(new SchemaPipe(ProjectEdit)) edit: ProjectEdit) {
    await this.effect.run(projects.updateProject(id, edit), userOf(req));
  }

  @Delete(':projectId')
  @HttpCode(204)
  async remove(@Req() req: Request, @Param('projectId', projectId) id: ProjectId) {
    await this.effect.run(projects.removeProject(id), userOf(req));
  }

  @Post(':projectId/pages')
  createPage(@Req() req: Request, @Param('projectId', projectId) id: ProjectId, @Body(new SchemaPipe(NewPage)) command: NewPage) {
    return this.effect.run(projects.createPage(id, command), userOf(req), Page);
  }

  @Patch(':projectId/pages/:pageId')
  @HttpCode(204)
  async updatePage(
    @Req() req: Request,
    @Param('projectId', projectId) id: ProjectId,
    @Param('pageId', pageId) page: PageId,
    @Body(new SchemaPipe(PageEdit)) edit: PageEdit,
  ) {
    await this.effect.run(projects.updatePage(id, page, edit), userOf(req));
  }

  @Delete(':projectId/pages/:pageId')
  @HttpCode(204)
  async removePage(@Req() req: Request, @Param('projectId', projectId) id: ProjectId, @Param('pageId', pageId) page: PageId) {
    await this.effect.run(projects.deletePage(id, page), userOf(req));
  }
}
