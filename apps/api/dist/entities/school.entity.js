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
Object.defineProperty(exports, "__esModule", { value: true });
exports.School = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../common/base.entity");
let School = class School extends base_entity_1.BaseEntity {
    name;
    logoUrl;
    address;
    phone;
    email;
    timezone;
    workingDays;
    lateThresholdMinutes;
    earlyDepartureThresholdMinutes;
    dataPlaneType;
    dataPlaneRef;
    dataPlaneConfigRef;
    dataPlaneStatus;
};
exports.School = School;
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], School.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'logo_url', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], School.prototype, "logoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 300, nullable: true }),
    __metadata("design:type", Object)
], School.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], School.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 320, nullable: true }),
    __metadata("design:type", Object)
], School.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64, default: 'Africa/Lagos' }),
    __metadata("design:type", String)
], School.prototype, "timezone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'working_days', type: 'jsonb', default: () => `'[1,2,3,4,5]'` }),
    __metadata("design:type", Array)
], School.prototype, "workingDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'late_threshold_minutes', type: 'int', default: 15 }),
    __metadata("design:type", Number)
], School.prototype, "lateThresholdMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'early_departure_threshold_minutes', type: 'int', default: 30 }),
    __metadata("design:type", Number)
], School.prototype, "earlyDepartureThresholdMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'data_plane_type', type: 'varchar', length: 20, default: 'shared' }),
    __metadata("design:type", String)
], School.prototype, "dataPlaneType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'data_plane_ref', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], School.prototype, "dataPlaneRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'data_plane_config_ref', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], School.prototype, "dataPlaneConfigRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'data_plane_status', type: 'varchar', length: 20, default: 'provisioned' }),
    __metadata("design:type", String)
], School.prototype, "dataPlaneStatus", void 0);
exports.School = School = __decorate([
    (0, typeorm_1.Entity)('schools')
], School);
//# sourceMappingURL=school.entity.js.map