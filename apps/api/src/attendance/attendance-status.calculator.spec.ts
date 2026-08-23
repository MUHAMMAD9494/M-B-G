import { AttendanceStatusCalculator } from './attendance-status.calculator';
import { AttendanceStatus, AttendanceType } from '@nexora/types';

// NOTE: The calculator anchors "start of day" to 08:00 local and "close" to
// 14:00 local. These tests use local-time Date constructors so they stay
// timezone-independent.
describe('AttendanceStatusCalculator', () => {
  const calc = new AttendanceStatusCalculator();

  function input(overrides: Partial<{
    type: AttendanceType;
    serverTime: Date;
    eventTime: Date;
    isWorkingDay: boolean;
    lateThresholdMinutes: number;
    earlyDepartureThresholdMinutes: number;
  }> = {}) {
    // serverTime is the trusted "now" when the event is processed (>= eventTime).
    return {
      type: AttendanceType.CHECK_IN,
      serverTime: new Date(2026, 7, 22, 9, 0, 0), // 09:00 local
      eventTime: new Date(2026, 7, 22, 8, 0, 0), // 08:00 local
      isWorkingDay: true,
      lateThresholdMinutes: 15,
      earlyDepartureThresholdMinutes: 30,
      ...overrides,
    };
  }

  it('returns PRESENT for an on-time check-in', () => {
    expect(calc.calculate(input())).toBe(AttendanceStatus.PRESENT);
  });

  it('returns LATE for a check-in after the late threshold', () => {
    expect(calc.calculate(input({ eventTime: new Date(2026, 7, 22, 8, 20, 0) }))).toBe(
      AttendanceStatus.LATE,
    );
  });

  it('returns PRESENT for a check-in exactly at the threshold', () => {
    expect(calc.calculate(input({ eventTime: new Date(2026, 7, 22, 8, 15, 0) }))).toBe(
      AttendanceStatus.PRESENT,
    );
  });

  it('returns EARLY for a check-out before the early threshold', () => {
    expect(
      calc.calculate({
        ...input({ type: AttendanceType.CHECK_OUT }),
        serverTime: new Date(2026, 7, 22, 15, 0, 0),
        eventTime: new Date(2026, 7, 22, 13, 0, 0),
      }),
    ).toBe(AttendanceStatus.EARLY);
  });

  it('returns PRESENT for a check-out at/after the early threshold', () => {
    expect(
      calc.calculate({
        ...input({ type: AttendanceType.CHECK_OUT }),
        serverTime: new Date(2026, 7, 22, 15, 0, 0),
        eventTime: new Date(2026, 7, 22, 13, 30, 0),
      }),
    ).toBe(AttendanceStatus.PRESENT);
  });

  it('returns PENDING_REVIEW for a check-in on a non-working day', () => {
    expect(calc.calculate(input({ isWorkingDay: false }))).toBe(AttendanceStatus.PENDING_REVIEW);
  });

  it('returns INVALID for a check-out on a non-working day', () => {
    expect(
      calc.calculate(input({ type: AttendanceType.CHECK_OUT, isWorkingDay: false })),
    ).toBe(AttendanceStatus.INVALID);
  });

  it('returns INVALID for a future-dated event beyond clock skew', () => {
    expect(
      calc.calculate(input({ eventTime: new Date(2026, 7, 22, 9, 10, 0) })),
    ).toBe(AttendanceStatus.INVALID);
  });
});
