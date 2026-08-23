import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { AuthUser } from '@nexora/types';

/**
 * V1 notification service: stores preferences only. Actual delivery
 * (email, SMS, WhatsApp, push) is a pluggable provider pattern left for V2+.
 */
@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationPreference)
    private readonly prefs: Repository<NotificationPreference>,
  ) {}

  async getPreferences(actor: AuthUser) {
    const rows = await this.prefs.find({ where: { userId: actor.id } });
    const map: Record<string, boolean> = {};
    for (const r of rows) map[r.channel] = r.enabled;
    return map;
  }

  async updatePreference(actor: AuthUser, channel: string, enabled: boolean) {
    const existing = await this.prefs.findOne({ where: { userId: actor.id, channel } });
    if (existing) {
      existing.enabled = enabled;
      return this.prefs.save(existing);
    }
    const pref = this.prefs.create({ userId: actor.id, schoolId: actor.schoolId, channel, enabled });
    return this.prefs.save(pref);
  }

  /**
   * Emit a notification event. V1 logs and returns; V2+ dispatches to
   * configured provider (email, SMS, WhatsApp, push).
   */
  async emit(_event: { type: string; schoolId: string | null; actorId: string; payload: Record<string, unknown> }) {
    // V1: no-op beyond audit (handled by caller).
    // V2: route to provider based on user preferences.
  }
}