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
exports.BiometricController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const biometric_service_1 = require("./biometric.service");
const permissions_decorator_1 = require("../common/permissions.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
class EnrollDto {
    teacherId;
    imageData;
}
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100000),
    __metadata("design:type", String)
], EnrollDto.prototype, "teacherId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(5000000),
    __metadata("design:type", String)
], EnrollDto.prototype, "imageData", void 0);
class VerifyDto {
    imageData;
}
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], VerifyDto.prototype, "imageData", void 0);
class LivenessDto {
    response;
    nonce;
    kind;
    issuedAt;
}
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(5000000),
    __metadata("design:type", String)
], LivenessDto.prototype, "response", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(36),
    __metadata("design:type", String)
], LivenessDto.prototype, "nonce", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsIn)(['blink', 'turn-left', 'turn-right', 'smile']),
    __metadata("design:type", String)
], LivenessDto.prototype, "kind", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], LivenessDto.prototype, "issuedAt", void 0);
let BiometricController = class BiometricController {
    biometric;
    constructor(biometric) {
        this.biometric = biometric;
    }
    meta(req) {
        return { ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.ip ?? null, userAgent: req.headers['user-agent'] ?? null };
    }
    async enroll(actor, dto, req) {
        return this.biometric.enroll(actor, dto.teacherId, dto.imageData, this.meta(req));
    }
    async verify(teacherId, dto) {
        return this.biometric.verify(teacherId, dto.imageData);
    }
    async livenessChallenge() {
        return this.biometric.livenessChallenge();
    }
    async livenessCheck(dto) {
        return this.biometric.livenessCheck({ kind: dto.kind, nonce: dto.nonce, issuedAt: dto.issuedAt }, dto.response);
    }
    async list(actor) {
        return this.biometric.list(actor);
    }
    async remove(actor, id, req) {
        return this.biometric.delete(actor, id, this.meta(req));
    }
};
exports.BiometricController = BiometricController;
__decorate([
    (0, common_1.Post)('enroll'),
    (0, permissions_decorator_1.Permissions)('settings.update'),
    (0, swagger_1.ApiOperation)({ summary: 'Enroll a biometric profile (dev-only adapter in V1)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, EnrollDto, Object]),
    __metadata("design:returntype", Promise)
], BiometricController.prototype, "enroll", null);
__decorate([
    (0, common_1.Post)('verify/:teacherId'),
    (0, permissions_decorator_1.Permissions)('attendance.create'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify identity against enrolled biometric (dev-only)' }),
    __param(0, (0, common_1.Param)('teacherId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, VerifyDto]),
    __metadata("design:returntype", Promise)
], BiometricController.prototype, "verify", null);
__decorate([
    (0, common_1.Post)('liveness/challenge'),
    (0, permissions_decorator_1.Permissions)('attendance.create'),
    (0, swagger_1.ApiOperation)({ summary: 'Issue a randomized liveness micro-challenge' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BiometricController.prototype, "livenessChallenge", null);
__decorate([
    (0, common_1.Post)('liveness/check'),
    (0, permissions_decorator_1.Permissions)('attendance.create'),
    (0, swagger_1.ApiOperation)({ summary: 'Submit a liveness response against a challenge' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LivenessDto]),
    __metadata("design:returntype", Promise)
], BiometricController.prototype, "livenessCheck", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('settings.read'),
    (0, swagger_1.ApiOperation)({ summary: 'List biometric profiles' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BiometricController.prototype, "list", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('settings.update'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a biometric enrollment' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], BiometricController.prototype, "remove", null);
exports.BiometricController = BiometricController = __decorate([
    (0, swagger_1.ApiTags)('biometrics'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, common_1.Controller)('biometrics'),
    __metadata("design:paramtypes", [biometric_service_1.BiometricService])
], BiometricController);
//# sourceMappingURL=biometric.controller.js.map