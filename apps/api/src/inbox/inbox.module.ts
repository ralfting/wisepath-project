import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InboxController } from './infrastructure/inbox.controller';

/** The learner's Inbox, served under /api/inbox; every route needs a session */
@Module({
  imports: [AuthModule],
  controllers: [InboxController],
})
export class InboxModule {}
