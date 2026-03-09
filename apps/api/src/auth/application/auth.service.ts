import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: signupDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Hash password with bcrypt (10 rounds)
    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    // Create user in database
    const user = await this.prisma.user.create({
      data: {
        email: signupDto.email,
        password: hashedPassword,
        name: signupDto.name || null,
      },
    });

    // Return sanitized user (no password)
    return this.sanitizeUser(user);
  }

  async login(loginDto: LoginDto) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare password with bcrypt
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.sanitizeUser(user);
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return this.sanitizeUser(user);
  }

  generateJwtToken(user: any) {
    const payload = {
      userId: user.id,
      email: user.email,
    };

    const token = this.jwtService.sign(payload);
    return token;
  }

  private sanitizeUser(user: any) {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}
