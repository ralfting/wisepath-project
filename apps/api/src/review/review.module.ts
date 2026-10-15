import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReviewController } from './infrastructure/review.controller';

/** Spaced review of the cards in the learner's pages, served under /api/review; every route needs a session */
@Module({
  imports: [AuthModule],
  controllers: [ReviewController],
})
export class ReviewModule {}
