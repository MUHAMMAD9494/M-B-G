"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const attendance_record_entity_1 = require("../entities/attendance-record.entity");
const teacher_entity_1 = require("../entities/teacher.entity");
const types_1 = require("@nexora/types");
let ReportsService = class ReportsService {
    records;
    teachers;
    constructor(records, teachers) {
        this.records = records;
        this.teachers = teachers;
    }
    async dailyReport(actor, date) {
        const d = new Date(date);
        const s = new Date(d);
        s.setHours(0, 0, 0, 0);
        const e = new Date(d);
        e.setHours(23, 59, 59, 999);
        return this.buildReport(actor, s, e);
    }
    async weeklyReport(actor, dateStr) {
        const d = new Date(dateStr);
        const day = d.getDay() || 7;
        const monday = new Date(d);
        monday.setDate(d.getDate() - day + 1);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        return this.buildReport(actor, monday, sunday);
    }
    async monthlyReport(actor, year, month) {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999);
        return this.buildReport(actor, start, end);
    }
    async teacherHistory(actor, teacherId) {
        const qb = this.records.createQueryBuilder('r')
            .leftJoinAndSelect('r.teacher', 't')
            .where('r.teacherId = :tid', { tid: teacherId })
            .orderBy('r.date', 'DESC')
            .limit(90);
        if (actor.role !== types_1.RoleName.SUPER_ADMIN)
            qb.andWhere('r.schoolId = :sid', { sid: actor.schoolId });
        return qb.getMany();
    }
    async exportCsv(actor, startDate, endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        const rows = await this.records.find({
            where: [
                ...(actor.role === types_1.RoleName.SUPER_ADMIN ? [] : [{ schoolId: actor.schoolId }]),
                { date: (0, typeorm_2.Between)(s, e) },
            ],
            relations: ['teacher', 'branch'],
            order: { date: 'ASC' },
        });
        const header = 'Teacher ID,Employee ID,First Name,Last Name,Branch,Date,Check In,Check Out,Status,Latitude,Longitude\n';
        const lines = rows.map((r) => {
            const t = r.teacher;
            return [
                r.id,
                t?.employeeId ?? '',
                t?.firstName ?? '',
                t?.lastName ?? '',
                r.branch?.name ?? '',
                r.date.toISOString().split('T')[0],
                r.checkInTime?.toISOString() ?? '',
                r.checkOutTime?.toISOString() ?? '',
                r.status,
                `${r.checkInLatitude},${r.checkInLongitude}`,
            ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
        });
        return header + lines.join('\n');
    }
    async buildReport(actor, start, end) {
        const qb = this.records.createQueryBuilder('r')
            .select('r.status', 'status').addSelect('COUNT(*)', 'count')
            .where('r."date" BETWEEN :s AND :e', { s: start, e: end })
            .groupBy('r.status');
        if (actor.schoolId)
            qb.andWhere('r.schoolId = :sid', { sid: actor.schoolId });
        const statusCounts = await qb.getRawMany();
        const totalTeachersQb = this.teachers.createQueryBuilder('t').select('COUNT(*)', 'cnt');
        if (actor.schoolId)
            totalTeachersQb.andWhere('t.schoolId = :sid', { sid: actor.schoolId });
        const { cnt: totalTeachers } = await totalTeachersQb.getRawOne();
        let present = 0, late = 0, early = 0, absent = 0;
        for (const row of statusCounts) {
            switch (row.status) {
                case types_1.AttendanceStatus.PRESENT:
                    present += parseInt(row.count, 10);
                    break;
                case types_1.AttendanceStatus.LATE:
                    late += parseInt(row.count, 10);
                    break;
                case types_1.AttendanceStatus.EARLY:
                    early += parseInt(row.count, 10);
                    break;
                default: break;
            }
        }
        absent = Math.max(0, parseInt(totalTeachers, 10) * this.workingDaysBetween(start, end).length - present - late - early);
        return { period: { start, end }, summary: { totalTeachers, present, late, early, absent }, breakdown: statusCounts };
    }
    workingDaysBetween(start, end) {
        const days = [];
        const cur = new Date(start);
        while (cur <= end) {
            const dow = cur.getDay();
            if (dow >= 1 && dow <= 5)
                days.push(dow);
            cur.setDate(cur.getDate() + 1);
        }
        return days;
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(attendance_record_entity_1.AttendanceRecord)),
    __param(1, (0, typeorm_1.InjectRepository)(teacher_entity_1.Teacher)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ReportsService);
//# sourceMappingURL=reports.service.js.map