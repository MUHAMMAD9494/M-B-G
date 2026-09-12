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
exports.UserRole = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../common/base.entity");
const role_entity_1 = require("./role.entity");
const user_entity_1 = require("./user.entity");
let UserRole = class UserRole extends base_entity_1.BaseEntity {
    userId;
    user;
    roleId;
    role;
    schoolId;
};
exports.UserRole = UserRole;
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid' }),
    __metadata("design:type", String)
], UserRole.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], UserRole.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'role_id', type: 'uuid' }),
    __metadata("design:type", String)
], UserRole.prototype, "roleId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => role_entity_1.Role, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'role_id' }),
    __metadata("design:type", role_entity_1.Role)
], UserRole.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'school_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], UserRole.prototype, "schoolId", void 0);
exports.UserRole = UserRole = __decorate([
    (0, typeorm_1.Entity)('user_roles'),
    (0, typeorm_1.Index)('idx_user_roles_user', ['userId'])
], UserRole);
//# sourceMappingURL=user-role.entity.js.map