"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConnection = void 0;
const ioredis_1 = require("ioredis");
exports.redisConnection = new ioredis_1.Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
});
//# sourceMappingURL=redisClient.js.map