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
exports.AttendanceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const attendance_service_1 = require("./attendance.service");
const attendance_dto_1 = require("./dto/attendance.dto");
const permissions_decorator_1 = require("../common/permissions.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
let AttendanceController = class AttendanceController {
    attendance;
    constructor(attendance) {
        this.attendance = attendance;
    }
    meta(req) {
        return {
            ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
        };
    }
    async record(actor, dto, req) {
        return this.attendance.recordAttendance(actor, dto, this.meta(req));
    }
    async sync(actor, dto, req) {
        return this.attendance.syncOffline(actor, dto, this.meta(req));
    }
    async list(actor, query) {
        return this.attendance.list(actor, query);
    }
    async todaySummary(actor) {
        return this.attendance.todaySummary(actor);
    }
    async correct(actor, id, dto, req) {
        return this.attendance.correct(actor, id, dto, this.meta(req));
    }
};
exports.AttendanceController = AttendanceController;
__decorate([
    (0, common_1.Post)('check-in'),
    (0, permissions_decorator_1.Permissions)('attendance.create'),
    (0, swagger_1.ApiOperation)({ summary: 'Record a real-time check-in or check-out' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, attendance_dto_1.CheckInDto, Object]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "record", null);
__decorate([
    (0, common_1.Post)('sync'),
    (0, permissions_decorator_1.Permissions)('attendance.create'),
    (0, swagger_1.ApiOperation)({ summary: 'Sync offline-captured attendance events' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, attendance_dto_1.SyncAttendanceDto, Object]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "sync", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('attendance.read'),
    (0, swagger_1.ApiOperation)({ summary: 'List attendance records (admin)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, attendance_dto_1.AttendanceQueryDto]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('today-summary'),
    (0, permissions_decorator_1.Permissions)('attendance.read'),
    (0, swagger_1.ApiOperation)({ summary: "Today's attendance summary for dashboard" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "todaySummary", null);
__decorate([
    (0, common_1.Patch)(':id/correct'),
    (0, permissions_decorator_1.Permissions)('attendance.correct'),
    (0, swagger_1.ApiOperation)({ summary: 'Correct an attendance record with audit trail' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, attendance_dto_1.CorrectAttendanceDto, Object]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "correct", null);
exports.AttendanceController = AttendanceController = __decorate([
    (0, swagger_1.ApiTags)('attendance'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, common_1.Controller)('attendance'),
    __metadata("design:paramtypes", [attendance_service_1.AttendanceService])
], AttendanceController);
//# sourceMappingURL=attendance.controller.js.map