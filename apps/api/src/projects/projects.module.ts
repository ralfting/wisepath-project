import { Module } from '@nestjs/common';
import { EffectRuntime } from './infrastructure/EffectRuntime';
import { ProjectsController } from './infrastructure/projects.controller';

/** The learner's maps and pages, served under /api/projects */
@Module({
  controllers: [ProjectsController],
  providers: [EffectRuntime],
})
export class ProjectsModule {}
