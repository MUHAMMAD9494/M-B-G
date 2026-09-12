"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const branch_entity_1 = require("../entities/branch.entity");
const branches_service_1 = require("./branches.service");
const branches_controller_1 = require("./branches.controller");
const audit_module_1 = require("../audit/audit.module");
let BranchesModule = class BranchesModule {
};
exports.BranchesModule = BranchesModule;
exports.BranchesModule = BranchesModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([branch_entity_1.Branch]), audit_module_1.AuditModule],
        providers: [branches_service_1.BranchesService],
        controllers: [branches_controller_1.BranchesController],
        exports: [branches_service_1.BranchesService],
    })
], BranchesModule);
//# sourceMappingURL=branches.module.js.map