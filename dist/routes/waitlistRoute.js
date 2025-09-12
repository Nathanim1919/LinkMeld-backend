"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const waitlistController_1 = require("../controllers/waitlistController");
const router = (0, express_1.Router)();
router.post("/join", waitlistController_1.joinWaitlist);
exports.default = router;
//# sourceMappingURL=waitlistRoute.js.map