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
exports.Branch = void 0;
const typeorm_1 = require("typeorm");
const types_1 = require("@nexora/types");
const base_entity_1 = require("../common/base.entity");
const school_entity_1 = require("./school.entity");
let Branch = class Branch extends base_entity_1.BaseEntity {
    schoolId;
    school;
    name;
    address;
    latitude;
    longitude;
    timezone;
    status;
};
exports.Branch = Branch;
__decorate([
    (0, typeorm_1.Index)('idx_branches_school_id'),
    (0, typeorm_1.Column)({ name: 'school_id', type: 'uuid' }),
    __metadata("design:type", String)
], Branch.prototype, "schoolId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => school_entity_1.School, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'school_id' }),
    __metadata("design:type", school_entity_1.School)
], Branch.prototype, "school", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], Branch.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 300, nullable: true }),
    __metadata("design:type", Object)
], Branch.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision', nullable: true }),
    __metadata("design:type", Object)
], Branch.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision', nullable: true }),
    __metadata("design:type", Object)
], Branch.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64, nullable: true }),
    __metadata("design:type", Object)
], Branch.prototype, "timezone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: types_1.BranchStatus, default: types_1.BranchStatus.ACTIVE }),
    __metadata("design:type", String)
], Branch.prototype, "status", void 0);
exports.Branch = Branch = __decorate([
    (0, typeorm_1.Entity)('branches'),
    (0, typeorm_1.Index)('idx_branches_school', ['schoolId'])
], Branch);
//# sourceMappingURL=branch.entity.js.map