"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qdrant = void 0;
const js_client_rest_1 = require("@qdrant/js-client-rest");
const QDRANT_CLOUD_URL = process.env.QDRANT_CLOUD_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const qdrant = new js_client_rest_1.QdrantClient({
    url: QDRANT_CLOUD_URL,
    apiKey: QDRANT_API_KEY,
});
exports.qdrant = qdrant;
//# sourceMappingURL=qdrant.js.map