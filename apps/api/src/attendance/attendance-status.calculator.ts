import { Injectable } from '@nestjs/common';
import { AttendanceStatus, AttendanceType } from '@nexora/types';

export interface StatusInput {
  type: AttendanceType;
  /** Server-received time (trusted). */
  serverTime: Date;
  /** Client-claimed event time (may be offline-captured). */
  eventTime: Date;
  /** Working-day ISO weekday (1=Mon..7=Sun). */
  isWorkingDay: boolean;
  lateThresholdMinutes: number;
  earlyDepartureThresholdMinutes: number;
}

/**
 * Deterministic attendance status resolution. Pure function -> unit-testable.
 *
 * Rules (documented in docs/ARCHITECTURE.md):
 * - Non-working day => INVALID (flagged for review via PENDING_REVIEW for check-ins).
 * - CHECK_IN after lateThreshold => LATE, else PRESENT.
 * - CHECK_OUT earlier than (expected close - earlyThreshold) => EARLY.
 * - Future-dated events beyond a small clock-skew allowance are INVALID.
 */
@Injectable()
export class AttendanceStatusCalculator {
  calculate(input: StatusInput): AttendanceStatus {
    const skewMs = 2 * 60 * 1000; // tolerate 2 min client clock skew
    if (input.eventTime.getTime() - input.serverTime.getTime() > skewMs) {
      return AttendanceStatus.INVALID;
    }

    if (!input.isWorkingDay) {
      return input.type === AttendanceType.CHECK_IN
        ? AttendanceStatus.PENDING_REVIEW
        : AttendanceStatus.INVALID;
    }

    // Reference "start of day" from the trusted server time in school timezone is
    // simplified in V1 to time-of-day comparisons anchored at 08:00 local and
    // 14:00 local close (configurable per school via settings in a future release;
    // the calculator interface stays stable).
    const anchor = new Date(input.serverTime);
    anchor.setHours(8, 0, 0, 0); // expected check-in
    const close = new Date(input.serverTime);
    close.setHours(14, 0, 0, 0); // expected check-out

    if (input.type === AttendanceType.CHECK_IN) {
      const lateAfter = new Date(anchor);
      lateAfter.setMinutes(lateAfter.getMinutes() + input.lateThresholdMinutes);
      return input.eventTime.getTime() > lateAfter.getTime()
        ? AttendanceStatus.LATE
        : AttendanceStatus.PRESENT;
    }

    // CHECK_OUT
    const earlyBefore = new Date(close);
    earlyBefore.setMinutes(earlyBefore.getMinutes() - input.earlyDepartureThresholdMinutes);
    if (input.eventTime.getTime() < earlyBefore.getTime()) {
      return AttendanceStatus.EARLY;
    }
    return AttendanceStatus.PRESENT;
  }
}
