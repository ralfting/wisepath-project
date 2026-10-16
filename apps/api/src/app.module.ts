import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { InboxModule } from './inbox/inbox.module';
import { LinksModule } from './links/links.module';
import { PathsModule } from './paths/paths.module';
import { ReviewModule } from './review/review.module';
import { SearchModule } from './search/search.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SharedModule,
    AuthModule,
    InboxModule,
    LinksModule,
    PathsModule,
    ReviewModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
