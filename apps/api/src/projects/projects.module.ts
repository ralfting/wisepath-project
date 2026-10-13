import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectsController } from './infrastructure/projects.controller';

/** The learner's maps and pages, served under /api/projects; every route needs a session */
@Module({
  imports: [AuthModule],
  controllers: [ProjectsController],
})
export class ProjectsModule {}
