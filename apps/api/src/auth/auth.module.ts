import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './infrastructure/auth.controller';
import { JwtAuthGuard } from './infrastructure/jwt.guard';
import { SESSION_HOURS } from './infrastructure/session';

/** Accounts and sessions, served under /api/auth; other modules guard their routes with JwtAuthGuard */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
        signOptions: { expiresIn: `${SESSION_HOURS}h` },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
