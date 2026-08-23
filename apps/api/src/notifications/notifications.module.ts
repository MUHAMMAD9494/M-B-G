import { Module } from '@nestjs/common';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationPreference])],
  providers: [NotificationsService],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
