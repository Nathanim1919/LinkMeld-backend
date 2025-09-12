"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authentication = void 0;
const auth_1 = require("../lib/auth");
const node_1 = require("better-auth/node");
const authentication = async (req, res, next) => {
    try {
        const headers = (0, node_1.fromNodeHeaders)(req.headers);
        const session = await auth_1.auth.api.getSession({
            headers: headers,
        });
        if (!session) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        req.user = session.user;
    }
    catch (error) {
        console.error("Authentication error:", error);
        res.status(500).json({ error: "Internal Server Error" });
        return;
    }
    next();
};
exports.authentication = authentication;
//# sourceMappingURL=authMiddleware.js.map