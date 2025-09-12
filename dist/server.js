"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./config/database");
const captureRoutes_1 = __importDefault(require("./routes/captureRoutes"));
const collectionRoute_1 = __importDefault(require("./routes/collectionRoute"));
const sourceRoute_1 = __importDefault(require("./routes/sourceRoute"));
const userRoute_1 = require("./routes/userRoute");
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const feedbackRoutes_1 = __importDefault(require("./routes/feedbackRoutes"));
const waitlistRoute_1 = __importDefault(require("./routes/waitlistRoute"));
const auth_1 = require("./lib/auth");
const node_1 = require("better-auth/node");
const dotenv_1 = __importDefault(require("dotenv"));
const body_parser_1 = __importDefault(require("body-parser"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
(0, database_1.connectMongo)();
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:5173",
        "https://deepen.live",
        "https://www.deepen.live",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));
app.all("/api/auth/*splat", (req, res) => {
    (0, node_1.toNodeHandler)(auth_1.auth)(req, res);
});
app.use(express_1.default.json());
app.use(body_parser_1.default.json({ limit: "10mb" }));
app.use(body_parser_1.default.urlencoded({ limit: "10mb", extended: true }));
app.use("/api/v1/captures", captureRoutes_1.default);
app.use("/api/v1/folders", collectionRoute_1.default);
app.use("/api/v1/sources", sourceRoute_1.default);
app.use("/api/v1/account", userRoute_1.userProfileRoutes);
app.use("/api/v1/ai", chatRoutes_1.default);
app.use("/api/v1/feedback", feedbackRoutes_1.default);
app.use("/api/v1/waitlist", waitlistRoute_1.default);
app.get("/api/me", async (req, res) => {
    const session = await auth_1.auth.api.getSession({
        headers: (0, node_1.fromNodeHeaders)(req.headers),
    });
    res.json(session);
});
app.get("/api/health", (_, res) => {
    res.status(200).json({ status: "ok", message: "Server is healthy" });
});
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
//# sourceMappingURL=server.js.map