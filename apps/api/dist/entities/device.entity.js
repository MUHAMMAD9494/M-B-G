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
exports.Device = void 0;
const typeorm_1 = require("typeorm");
const types_1 = require("@nexora/types");
const base_entity_1 = require("../common/base.entity");
const school_entity_1 = require("./school.entity");
const user_entity_1 = require("./user.entity");
let Device = class Device extends base_entity_1.BaseEntity {
    schoolId;
    school;
    userId;
    user;
    deviceIdentifier;
    deviceType;
    platform;
    lastSeenAt;
    status;
};
exports.Device = Device;
__decorate([
    (0, typeorm_1.Column)({ name: 'school_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Device.prototype, "schoolId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => school_entity_1.School, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'school_id' }),
    __metadata("design:type", school_entity_1.School)
], Device.prototype, "school", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Device.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", Object)
], Device.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_identifier', type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], Device.prototype, "deviceIdentifier", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_type', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], Device.prototype, "deviceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], Device.prototype, "platform", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_seen_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], Device.prototype, "lastSeenAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: types_1.DeviceStatus, default: types_1.DeviceStatus.ACTIVE }),
    __metadata("design:type", String)
], Device.prototype, "status", void 0);
exports.Device = Device = __decorate([
    (0, typeorm_1.Entity)('devices'),
    (0, typeorm_1.Index)('idx_devices_school', ['schoolId'])
], Device);
//# sourceMappingURL=device.entity.js.map