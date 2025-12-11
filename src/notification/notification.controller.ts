import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  async getUserNotifications(
    @Req() req: any,
    @Query('isRead') isRead?: string,
    @Query('type') type?: NotificationType,
    @Query('limit') limit?: string,
  ) {
    const filters: any = {};

    if (isRead !== undefined) {
      filters.isRead = isRead === 'true';
    }

    if (type) {
      filters.type = type;
    }

    if (limit) {
      filters.limit = parseInt(limit, 10);
    }

    return this.notificationService.getUserNotifications(
      req.user.id,
      filters,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Req() req: any) {
    return this.notificationService.getUnreadCount(req.user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get notification statistics' })
  async getStats(@Req() req: any) {
    return this.notificationService.getStats(req.user.id);
  }

  @Put('mark-read')
  @ApiOperation({ summary: 'Mark notifications as read' })
  async markAsRead(
    @Req() req: any,
    @Body('notificationId') notificationId?: string,
    @Body('ids') ids?: string[],
  ) {
    return this.notificationService.markAsRead(
      req.user.id,
      notificationId,
      ids,
    );
  }

  @Put('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req: any) {
    return this.notificationService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(@Req() req: any, @Param('id') id: string) {
    return this.notificationService.deleteNotification(req.user.id, id);
  }

  // Endpoint untuk testing (bisa dihapus di production)
  @Post('test')
  @ApiOperation({ summary: 'Create test notification' })
  async createTestNotification(@Req() req: any) {
    return this.notificationService.createNotification({
      userId: req.user.id,
      type: NotificationType.SYSTEM,
      title: 'Test Notification',
      message: 'This is a test notification from the system',
      icon: 'announcement',
      iconColor: '#3B82F6',
      data: {
        test: true,
        timestamp: new Date().toISOString(),
      },
      createdBy: req.user.id,
    });
  }
}