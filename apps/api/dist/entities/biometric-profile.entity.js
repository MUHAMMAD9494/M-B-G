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
exports.BiometricProfile = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../common/base.entity");
const school_entity_1 = require("./school.entity");
const teacher_entity_1 = require("./teacher.entity");
const user_entity_1 = require("./user.entity");
let BiometricProfile = class BiometricProfile extends base_entity_1.BaseEntity {
    schoolId;
    school;
    teacherId;
    teacher;
    providerType;
    embeddingHash;
    status;
    enrolledBy;
    enroller;
};
exports.BiometricProfile = BiometricProfile;
__decorate([
    (0, typeorm_1.Column)({ name: 'school_id', type: 'uuid' }),
    __metadata("design:type", String)
], BiometricProfile.prototype, "schoolId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => school_entity_1.School, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'school_id' }),
    __metadata("design:type", school_entity_1.School)
], BiometricProfile.prototype, "school", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'teacher_id', type: 'uuid' }),
    __metadata("design:type", String)
], BiometricProfile.prototype, "teacherId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => teacher_entity_1.Teacher, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'teacher_id' }),
    __metadata("design:type", teacher_entity_1.Teacher)
], BiometricProfile.prototype, "teacher", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'provider_type', type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], BiometricProfile.prototype, "providerType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'embedding_hash', type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], BiometricProfile.prototype, "embeddingHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'ACTIVE' }),
    __metadata("design:type", String)
], BiometricProfile.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'enrolled_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], BiometricProfile.prototype, "enrolledBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'enrolled_by' }),
    __metadata("design:type", Object)
], BiometricProfile.prototype, "enroller", void 0);
exports.BiometricProfile = BiometricProfile = __decorate([
    (0, typeorm_1.Entity)('biometric_profiles'),
    (0, typeorm_1.Index)('idx_biometric_school', ['schoolId']),
    (0, typeorm_1.Index)('idx_biometric_teacher', ['teacherId'])
], BiometricProfile);
//# sourceMappingURL=biometric-profile.entity.js.map