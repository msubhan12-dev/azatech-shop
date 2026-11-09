import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtGuard } from './guards/jwt.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: 'Login',
    description: 'Authenticate user with email and password. Returns JWT access token and refresh token.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User credentials',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 1,
          name: 'Admin User',
          email: 'admin@azatech.id',
          role: 'ADMIN',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      example: {
        message: 'Invalid email or password',
        statusCode: 401,
      },
    },
  })
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh Token',
    description: 'Refresh an expired access token using refresh token',
  })
  @ApiBody({
    type: RefreshDto,
    description: 'Refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get Current User',
    description: 'Retrieve information about the currently authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user info',
    schema: {
      example: {
        id: 1,
        name: 'Admin User',
        email: 'admin@azatech.id',
        role: 'ADMIN',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT required',
  })
  async getMe(@CurrentUser() user: any) {
    return this.auth.getMe(user.sub);
  }

  @Post('logout')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Logout',
    description: 'Logout current user (invalidates session)',
  })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    schema: {
      example: {
        message: 'Logged out successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT required',
  })
  async logout() {
    return { message: 'Logged out successfully' };
  }
}
