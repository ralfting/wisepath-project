import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LinksController } from './infrastructure/links.controller';

/** Previews of external links in the notes, served under /api/link-preview; needs a session */
@Module({
  imports: [AuthModule],
  controllers: [LinksController],
})
export class LinksModule {}
