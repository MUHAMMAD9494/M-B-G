"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const attendance_record_entity_1 = require("../entities/attendance-record.entity");
const attendance_event_entity_1 = require("../entities/attendance-event.entity");
const teacher_entity_1 = require("../entities/teacher.entity");
const geofence_entity_1 = require("../entities/geofence.entity");
const school_entity_1 = require("../entities/school.entity");
const attendance_service_1 = require("./attendance.service");
const attendance_controller_1 = require("./attendance.controller");
const attendance_status_calculator_1 = require("./attendance-status.calculator");
const audit_module_1 = require("../audit/audit.module");
const geofencing_module_1 = require("../geofencing/geofencing.module");
let AttendanceModule = class AttendanceModule {
};
exports.AttendanceModule = AttendanceModule;
exports.AttendanceModule = AttendanceModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([attendance_record_entity_1.AttendanceRecord, attendance_event_entity_1.AttendanceEvent, teacher_entity_1.Teacher, geofence_entity_1.Geofence, school_entity_1.School]),
            audit_module_1.AuditModule,
            geofencing_module_1.GeofencingModule,
        ],
        providers: [attendance_service_1.AttendanceService, attendance_status_calculator_1.AttendanceStatusCalculator],
        controllers: [attendance_controller_1.AttendanceController],
        exports: [attendance_service_1.AttendanceService],
    })
], AttendanceModule);
//# sourceMappingURL=attendance.module.js.map