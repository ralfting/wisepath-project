import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PathsController } from './infrastructure/paths.controller';
import { PublicPathsController } from './infrastructure/public-paths.controller';

/** The learner's maps and pages under /api/paths, which need a session; public maps under /api/public/paths */
@Module({
  imports: [AuthModule],
  controllers: [PathsController, PublicPathsController],
})
export class PathsModule {}
