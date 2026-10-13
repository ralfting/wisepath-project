import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './infrastructure/auth.controller';
import { JwtAuthGuard } from './infrastructure/jwt.guard';
import { jwtSecret } from './infrastructure/jwtSecret';
import { SESSION_HOURS } from './infrastructure/session';

/** Accounts and sessions, served under /api/auth; other modules guard their routes with JwtAuthGuard */
@Module({
  imports: [
    JwtModule.registerAsync({
      // Read when the app starts, after ConfigModule has loaded .env
      useFactory: () => ({
        secret: jwtSecret(process.env),
        signOptions: { expiresIn: `${SESSION_HOURS}h` },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
