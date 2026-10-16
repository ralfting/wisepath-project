import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Effect, Schema } from 'effect';
import { NewProject, Project, ProjectEdit, ProjectId } from '@wisepath/domain/projects';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt.guard';
import { EffectRuntime } from '../../shared/infrastructure/EffectRuntime';
import { SchemaPipe } from '../../shared/infrastructure/SchemaPipe';
import { CurrentUser } from '../../paths/application/CurrentUser';
import * as projects from '../application/projects';

/**
 * ProjectsController
 * /api/projects as the contract (ProjectsApiGroup in @wisepath/contract)
 * describes it.
 */

/** Runs as the session's user, whom the guard put on the request */
const asUser = (req: Request) => Effect.provideService(CurrentUser, { id: req.user!.id });

const projectId = new SchemaPipe(ProjectId);

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly effect: EffectRuntime) {}

  @Get()
  list(@Req() req: Request) {
    return this.effect.respond(projects.listProjects().pipe(asUser(req)), Schema.Array(Project));
  }

  @Post()
  create(@Req() req: Request, @Body(new SchemaPipe(NewProject)) command: NewProject) {
    return this.effect.respond(projects.createProject(command).pipe(asUser(req)), Project);
  }

  @Patch(':projectId')
  @HttpCode(204)
  async rename(
    @Req() req: Request,
    @Param('projectId', projectId) id: ProjectId,
    @Body(new SchemaPipe(ProjectEdit)) edit: ProjectEdit,
  ) {
    await this.effect.run(projects.renameProject(id, edit).pipe(asUser(req)));
  }

  @Delete(':projectId')
  @HttpCode(204)
  async remove(@Req() req: Request, @Param('projectId', projectId) id: ProjectId) {
    await this.effect.run(projects.removeProject(id).pipe(asUser(req)));
  }
}
