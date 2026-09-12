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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const reports_service_1 = require("./reports.service");
const permissions_decorator_1 = require("../common/permissions.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
let ReportsController = class ReportsController {
    reports;
    constructor(reports) {
        this.reports = reports;
    }
    async daily(actor, date) {
        return this.reports.dailyReport(actor, date);
    }
    async weekly(actor, date) {
        return this.reports.weeklyReport(actor, date);
    }
    async monthly(actor, year, month) {
        return this.reports.monthlyReport(actor, parseInt(year, 10), parseInt(month, 10));
    }
    async teacherHistory(actor, teacherId) {
        return this.reports.teacherHistory(actor, teacherId);
    }
    async exportCsv(actor, startDate, endDate, res) {
        const csv = await this.reports.exportCsv(actor, startDate, endDate);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=attendance-${startDate}-${endDate}.csv`);
        res.send(csv);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('daily'),
    (0, permissions_decorator_1.Permissions)('reports.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Daily attendance report' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "daily", null);
__decorate([
    (0, common_1.Get)('weekly'),
    (0, permissions_decorator_1.Permissions)('reports.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Weekly attendance report' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "weekly", null);
__decorate([
    (0, common_1.Get)('monthly'),
    (0, permissions_decorator_1.Permissions)('reports.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Monthly attendance report' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "monthly", null);
__decorate([
    (0, common_1.Get)('teacher/:teacherId/history'),
    (0, permissions_decorator_1.Permissions)('reports.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Teacher attendance history' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('teacherId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "teacherHistory", null);
__decorate([
    (0, common_1.Get)('export/csv'),
    (0, permissions_decorator_1.Permissions)('reports.export'),
    (0, swagger_1.ApiOperation)({ summary: 'Export attendance as CSV' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportCsv", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiTags)('reports'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map