import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SearchController } from './infrastructure/search.controller';

/** Search everywhere, served under /api/search; needs a session */
@Module({
  imports: [AuthModule],
  controllers: [SearchController],
})
export class SearchModule {}
