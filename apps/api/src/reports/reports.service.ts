import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AttendanceRecord } from '../entities/attendance-record.entity';
import { Teacher } from '../entities/teacher.entity';
import { AuthUser, RoleName, AttendanceStatus } from '@nexora/types';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(AttendanceRecord) private readonly records: Repository<AttendanceRecord>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
  ) {}

  async dailyReport(actor: AuthUser, date: string) {
    const d = new Date(date);
    const s = new Date(d); s.setHours(0, 0, 0, 0);
    const e = new Date(d); e.setHours(23, 59, 59, 999);
    return this.buildReport(actor, s, e);
  }

  async weeklyReport(actor: AuthUser, dateStr: string) {
    const d = new Date(dateStr);
    const day = d.getDay() || 7; // Monday=1 ... Sunday=7
    const monday = new Date(d); monday.setDate(d.getDate() - day + 1); monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
    return this.buildReport(actor, monday, sunday);
  }

  async monthlyReport(actor: AuthUser, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return this.buildReport(actor, start, end);
  }

  async teacherHistory(actor: AuthUser, teacherId: string) {
    const qb = this.records.createQueryBuilder('r')
      .leftJoinAndSelect('r.teacher', 't')
      .where('r.teacherId = :tid', { tid: teacherId })
      .orderBy('r.date', 'DESC')
      .limit(90);
    if (actor.role !== RoleName.SUPER_ADMIN) qb.andWhere('r.schoolId = :sid', { sid: actor.schoolId });
    return qb.getMany();
  }

  async exportCsv(actor: AuthUser, startDate: string, endDate: string) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const rows = await this.records.find({
      where: [
        ...(actor.role === RoleName.SUPER_ADMIN ? [] : [{ schoolId: actor.schoolId }] as never),
        { date: Between(s, e) } as never,
      ],
      relations: ['teacher', 'branch'],
      order: { date: 'ASC' },
    });

    // CSV header
    const header = 'Teacher ID,Employee ID,First Name,Last Name,Branch,Date,Check In,Check Out,Status,Latitude,Longitude\n';
    const lines = rows.map((r) => {
      const t = r.teacher;
      return [
        r.id,
        t?.employeeId ?? '',
        t?.firstName ?? '',
        t?.lastName ?? '',
        (r.branch as any)?.name ?? '',
        r.date.toISOString().split('T')[0],
        r.checkInTime?.toISOString() ?? '',
        r.checkOutTime?.toISOString() ?? '',
        r.status,
        `${r.checkInLatitude},${r.checkInLongitude}`,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    return header + lines.join('\n');
  }

  private async buildReport(actor: AuthUser, start: Date, end: Date) {
    const qb = this.records.createQueryBuilder('r')
      .select('r.status', 'status').addSelect('COUNT(*)', 'count')
      .where('r."date" BETWEEN :s AND :e', { s: start, e: end })
      .groupBy('r.status');
    if (actor.schoolId) qb.andWhere('r.schoolId = :sid', { sid: actor.schoolId });
    const statusCounts = await qb.getRawMany();

    const totalTeachersQb = this.teachers.createQueryBuilder('t').select('COUNT(*)', 'cnt');
    if (actor.schoolId) totalTeachersQb.andWhere('t.schoolId = :sid', { sid: actor.schoolId });
    const { cnt: totalTeachers } = await totalTeachersQb.getRawOne();

    let present = 0, late = 0, early = 0, absent = 0;
    for (const row of statusCounts) {
      switch (row.status) {
        case AttendanceStatus.PRESENT: present += parseInt(row.count, 10); break;
        case AttendanceStatus.LATE: late += parseInt(row.count, 10); break;
        case AttendanceStatus.EARLY: early += parseInt(row.count, 10); break;
        default: break;
      }
    }
    absent = Math.max(0, parseInt(totalTeachers, 10) * this.workingDaysBetween(start, end).length - present - late - early);

    return { period: { start, end }, summary: { totalTeachers, present, late, early, absent }, breakdown: statusCounts };
  }

  private workingDaysBetween(start: Date, end: Date): number[] {
    const days: number[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const dow = cur.getDay();
      if (dow >= 1 && dow <= 5) days.push(dow);
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }
}
