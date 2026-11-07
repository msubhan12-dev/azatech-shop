import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtPayload, AuthUser } from '../interfaces/auth-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'change-this-in-production'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    // payload.type harus "access"
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // payload.sub adalah user ID (string)
    const userId = payload.sub;
    if (!userId) {
      throw new UnauthorizedException('Invalid token: no user ID');
    }

    // Cari user di database
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: BigInt(userId) },
        select: { id: true, email: true, name: true, role: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Return user object - ini akan jadi req.user
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    } catch (err) {
      console.error('JWT validation error:', err);
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
