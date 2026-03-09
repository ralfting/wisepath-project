import { Controller, Post, Get, Body, Res, UseGuards, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from '../application/auth.service';
import { SignupDto } from '../application/dto/signup.dto';
import { LoginDto } from '../application/dto/login.dto';
import { JwtAuthGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  async signup(@Body() signupDto: SignupDto, @Res() res: Response) {
    const user = await this.authService.signup(signupDto);
    const token = this.authService.generateJwtToken(user);

    // Set httpOnly cookie: 24h (86400000ms)
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return res.json({ user });
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    const user = await this.authService.login(loginDto);
    const token = this.authService.generateJwtToken(user);

    // Set httpOnly cookie
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return res.json({ user });
  }

  @Post('logout')
  async logout(@Res() res: Response) {
    // Clear the cookie
    res.clearCookie('access_token');
    return res.json({ message: 'Logged out' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: Request) {
    return { user: req.user };
  }
}
