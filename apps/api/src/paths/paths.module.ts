import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PathsController } from './infrastructure/paths.controller';

/** The learner's maps and pages, served under /api/paths; every route needs a session */
@Module({
  imports: [AuthModule],
  controllers: [PathsController],
})
export class PathsModule {}
