"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceStatusCalculator = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@nexora/types");
let AttendanceStatusCalculator = class AttendanceStatusCalculator {
    calculate(input) {
        const skewMs = 2 * 60 * 1000;
        if (input.eventTime.getTime() - input.serverTime.getTime() > skewMs) {
            return types_1.AttendanceStatus.INVALID;
        }
        if (!input.isWorkingDay) {
            return input.type === types_1.AttendanceType.CHECK_IN
                ? types_1.AttendanceStatus.PENDING_REVIEW
                : types_1.AttendanceStatus.INVALID;
        }
        const anchor = new Date(input.serverTime);
        anchor.setHours(8, 0, 0, 0);
        const close = new Date(input.serverTime);
        close.setHours(14, 0, 0, 0);
        if (input.type === types_1.AttendanceType.CHECK_IN) {
            const lateAfter = new Date(anchor);
            lateAfter.setMinutes(lateAfter.getMinutes() + input.lateThresholdMinutes);
            return input.eventTime.getTime() > lateAfter.getTime()
                ? types_1.AttendanceStatus.LATE
                : types_1.AttendanceStatus.PRESENT;
        }
        const earlyBefore = new Date(close);
        earlyBefore.setMinutes(earlyBefore.getMinutes() - input.earlyDepartureThresholdMinutes);
        if (input.eventTime.getTime() < earlyBefore.getTime()) {
            return types_1.AttendanceStatus.EARLY;
        }
        return types_1.AttendanceStatus.PRESENT;
    }
};
exports.AttendanceStatusCalculator = AttendanceStatusCalculator;
exports.AttendanceStatusCalculator = AttendanceStatusCalculator = __decorate([
    (0, common_1.Injectable)()
], AttendanceStatusCalculator);
//# sourceMappingURL=attendance-status.calculator.js.map