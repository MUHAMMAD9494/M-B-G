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
exports.NotificationPreference = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../common/base.entity");
let NotificationPreference = class NotificationPreference extends base_entity_1.BaseEntity {
    userId;
    schoolId;
    channel;
    enabled;
};
exports.NotificationPreference = NotificationPreference;
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid' }),
    __metadata("design:type", String)
], NotificationPreference.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'school_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], NotificationPreference.prototype, "schoolId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 40 }),
    __metadata("design:type", String)
], NotificationPreference.prototype, "channel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], NotificationPreference.prototype, "enabled", void 0);
exports.NotificationPreference = NotificationPreference = __decorate([
    (0, typeorm_1.Entity)('notification_preferences'),
    (0, typeorm_1.Index)('idx_notif_user', ['userId'])
], NotificationPreference);
//# sourceMappingURL=notification-preference.entity.js.map