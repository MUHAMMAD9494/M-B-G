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
exports.InviteUserDto = exports.RegisterSchoolDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const types_1 = require("@nexora/types");
class RegisterSchoolDto {
    schoolName;
    adminEmail;
    adminFullName;
    adminPhone;
    password;
    inviteCode;
}
exports.RegisterSchoolDto = RegisterSchoolDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Green Valley Academy' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], RegisterSchoolDto.prototype, "schoolName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'owner@greenvalley.edu.ng' }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(320),
    __metadata("design:type", String)
], RegisterSchoolDto.prototype, "adminEmail", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Amina Yusuf' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], RegisterSchoolDto.prototype, "adminFullName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+2348012345678' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], RegisterSchoolDto.prototype, "adminPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Teacher@123' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], RegisterSchoolDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Required only when the server has INVITE_CODE configured.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], RegisterSchoolDto.prototype, "inviteCode", void 0);
class InviteUserDto {
    email;
    role;
}
exports.InviteUserDto = InviteUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'teacher@greenvalley.edu.ng' }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(320),
    __metadata("design:type", String)
], InviteUserDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: types_1.RoleName }),
    (0, class_validator_1.IsEnum)(types_1.RoleName),
    __metadata("design:type", String)
], InviteUserDto.prototype, "role", void 0);
//# sourceMappingURL=onboarding.dto.js.map