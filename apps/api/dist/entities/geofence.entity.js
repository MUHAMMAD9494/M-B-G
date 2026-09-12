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
exports.Geofence = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../common/base.entity");
const branch_entity_1 = require("./branch.entity");
const school_entity_1 = require("./school.entity");
let Geofence = class Geofence extends base_entity_1.BaseEntity {
    schoolId;
    school;
    branchId;
    branch;
    name;
    latitude;
    longitude;
    radius;
    active;
};
exports.Geofence = Geofence;
__decorate([
    (0, typeorm_1.Column)({ name: 'school_id', type: 'uuid' }),
    __metadata("design:type", String)
], Geofence.prototype, "schoolId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => school_entity_1.School, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'school_id' }),
    __metadata("design:type", school_entity_1.School)
], Geofence.prototype, "school", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'branch_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Geofence.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => branch_entity_1.Branch, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'branch_id' }),
    __metadata("design:type", Object)
], Geofence.prototype, "branch", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], Geofence.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision' }),
    __metadata("design:type", Number)
], Geofence.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision' }),
    __metadata("design:type", Number)
], Geofence.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 100 }),
    __metadata("design:type", Number)
], Geofence.prototype, "radius", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Geofence.prototype, "active", void 0);
exports.Geofence = Geofence = __decorate([
    (0, typeorm_1.Entity)('geofences'),
    (0, typeorm_1.Index)('idx_geofences_school', ['schoolId'])
], Geofence);
//# sourceMappingURL=geofence.entity.js.map