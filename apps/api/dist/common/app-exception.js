"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppException = void 0;
const common_1 = require("@nestjs/common");
class AppException extends common_1.HttpException {
    code;
    details;
    constructor(code, message, status = common_1.HttpStatus.BAD_REQUEST, details) {
        super(message, status);
        this.code = code;
        this.details = details;
    }
}
exports.AppException = AppException;
//# sourceMappingURL=app-exception.js.map