"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
exports.buildQuery = buildQuery;
const errors_1 = require("./errors");
class HttpClient {
    base;
    logger;
    constructor(baseURL, logger) {
        this.base = baseURL + '/backend/v1';
        this.logger = logger;
    }
    async do(req) {
        let bodyStr;
        if (req.body != null) {
            bodyStr = JSON.stringify(req.body);
        }
        else if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            bodyStr = '{}';
        }
        let fullURL = this.base + req.path;
        if (req.query) {
            const params = new URLSearchParams();
            for (const [k, v] of Object.entries(req.query)) {
                if (v)
                    params.set(k, v);
            }
            const qs = params.toString();
            if (qs)
                fullURL += '?' + qs;
        }
        const headers = {};
        if (bodyStr) {
            headers['Content-Type'] = 'application/json';
        }
        if (req.authType === 'sdk-key') {
            headers['X-SDK-Key'] = req.authVal;
        }
        this.logger.debug('http request', { method: req.method, url: fullURL });
        const resp = await fetch(fullURL, {
            method: req.method,
            headers,
            body: bodyStr,
        });
        const respBody = await resp.text();
        if (resp.status >= 400) {
            try {
                const parsed = JSON.parse(respBody);
                if (parsed.reason) {
                    throw new errors_1.APIError(resp.status, parsed.code ?? resp.status, parsed.reason, parsed.message ?? '');
                }
            }
            catch (e) {
                if (e instanceof errors_1.APIError)
                    throw e;
            }
            throw new errors_1.APIError(resp.status, resp.status, 'UNKNOWN', respBody);
        }
        if (respBody) {
            return JSON.parse(respBody);
        }
        return undefined;
    }
}
exports.HttpClient = HttpClient;
function buildQuery(page, pageSize, extras) {
    const q = {};
    if (page > 0)
        q.page = String(page);
    if (pageSize > 0)
        q.page_size = String(pageSize);
    if (extras) {
        for (const [k, v] of Object.entries(extras)) {
            if (v)
                q[k] = v;
        }
    }
    return q;
}
