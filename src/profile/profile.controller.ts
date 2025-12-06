import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Query,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import {
  UpdateProfileDto,
  EmailChangeRequestDto,
  VerifyEmailChangeDto,
  UpdatePhoneNumberDto,
  UpdateBioDto,
} from './dto/profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Profile')
@Controller('profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) { }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@Request() req) {
    console.log('🔐 JWT User:', req.user);
    const userId = req.user.sub || req.user.id; // sub biasanya berisi user ID dari JWT
    if (!userId) {
      throw new Error('User ID tidak ditemukan dalam token');
    }
    return this.profileService.getUserProfile(Number(userId));
  }

  @Put('update')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data provided' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    console.log('🔐 JWT User:', req.user);
    const userId = req.user.sub || req.user.id;
    if (!userId) {
      throw new Error('User ID tidak ditemukan dalam token');
    }
    return this.profileService.updateProfile(Number(userId), updateProfileDto);
  }

  @Post('upload-picture')
  @ApiOperation({ summary: 'Upload profile picture' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    console.log('🔐 JWT User:', req.user);
    const userId = req.user.sub || req.user.id;
    if (!userId) {
      throw new Error('User ID tidak ditemukan dalam token');
    }
    return this.profileService.uploadProfilePicture(Number(userId), file);
  }

  @Delete('picture')
  @ApiOperation({ summary: 'Delete profile picture' })
  async deleteProfilePicture(@Request() req) {
    console.log('🔐 JWT User:', req.user);
    const userId = req.user.sub || req.user.id;
    if (!userId) {
      throw new Error('User ID tidak ditemukan dalam token');
    }
    return this.profileService.deleteProfilePicture(Number(userId));
  }

  @Put('bio')
  @ApiOperation({ summary: 'Update user bio' })
  async updateBio(@Request() req, @Body() updateBioDto: UpdateBioDto) {
    console.log('🔐 JWT User:', req.user);
    const userId = req.user.sub || req.user.id;
    if (!userId) {
      throw new Error('User ID tidak ditemukan dalam token');
    }
    return this.profileService.updateBio(Number(userId), updateBioDto.bio);
  }

  @Get('kk-status')
  @ApiOperation({ summary: 'Get KK verification status' })
  async getKKVerificationStatus(@Request() req) {
    console.log('🔐 JWT User:', req.user);
    const userId = req.user.sub || req.user.id;
    if (!userId) {
      throw new Error('User ID tidak ditemukan dalam token');
    }
    return this.profileService.getKKVerificationStatus(Number(userId));
  }

  @Post('request-email-change')
  @ApiOperation({ summary: 'Request email change (requires OTP)' })
  async requestEmailChange(
    @Request() req,
    @Body() emailChangeDto: EmailChangeRequestDto,
  ) {
    console.log('🔐 JWT User:', req.user);
    const userId = req.user.sub || req.user.id;
    if (!userId) {
      throw new Error('User ID tidak ditemukan dalam token');
    }
    return this.profileService.requestEmailChange(Number(userId), emailChangeDto.newEmail);
  }

  @Post('verify-email-change')
  @ApiOperation({ summary: 'Verify email change with OTP' })
  async verifyEmailChange(
    @Request() req,
    @Body() verifyEmailChangeDto: VerifyEmailChangeDto,
  ) {
    console.log('🔐 JWT User:', req.user);
    const userId = req.user.sub || req.user.id;
    if (!userId) {
      throw new Error('User ID tidak ditemukan dalam token');
    }
    return this.profileService.verifyEmailChange(Number(userId), verifyEmailChangeDto.otpCode);
  }

  @Put('phone-number')
  @ApiOperation({ summary: 'Update phone number' })
  async updatePhoneNumber(
    @Request() req,
    @Body() updatePhoneNumberDto: UpdatePhoneNumberDto,
  ) {
    console.log('🔐 JWT User:', req.user);
    const userId = req.user.sub || req.user.id;
    if (!userId) {
      throw new Error('User ID tidak ditemukan dalam token');
    }
    return this.profileService.updatePhoneNumber(Number(userId), updatePhoneNumberDto.phoneNumber);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get user activity logs' })
  async getProfileActivity(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    console.log('🔐 JWT User:', req.user);
    const userId = req.user.sub || req.user.id;
    if (!userId) {
      throw new Error('User ID tidak ditemukan dalam token');
    }
    return this.profileService.getProfileActivity(Number(userId), page, limit);
  }

  @Get('dashboard-stats')
  @ApiOperation({ summary: 'Get user dashboard statistics' })
  async getUserDashboardStats(@Request() req) {
    console.log('🔐 JWT User:', req.user);
    const userId = req.user.sub || req.user.id;
    if (!userId) {
      throw new Error('User ID tidak ditemukan dalam token');
    }
    return this.profileService.getUserDashboardStats(Number(userId));
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user profile by ID (admin only)' })
  async getUserProfileById(@Param('userId') userId: string) {
    console.log('📋 Getting profile for userId:', userId);
    return this.profileService.getUserProfile(Number(userId));
  }
}