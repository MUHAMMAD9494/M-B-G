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
exports.TokenService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const crypto_1 = require("crypto");
const JWT_ISSUER = process.env.JWT_ISSUER ?? 'nexora';
let TokenService = class TokenService {
    jwt;
    constructor(jwt) {
        this.jwt = jwt;
    }
    signAccessToken(payload) {
        return this.jwt.signAsync({ ...payload, type: 'access', iss: JWT_ISSUER });
    }
    verifyAccessToken(token) {
        return this.jwt.verifyAsync(token, { issuer: JWT_ISSUER });
    }
    generateRefreshToken() {
        const token = (0, crypto_1.randomBytes)(48).toString('base64url');
        return { token, hash: this.hashToken(token) };
    }
    hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
};
exports.TokenService = TokenService;
exports.TokenService = TokenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], TokenService);
//# sourceMappingURL=token.service.js.map