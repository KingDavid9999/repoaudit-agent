"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentClient = void 0;
const path_1 = require("path");
const http_client_1 = require("./http-client");
const ws_1 = require("./ws");
const balance_1 = require("./balance");
const MIME_TYPES = {
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.zip': 'application/zip',
    '.xml': 'application/xml',
    '.html': 'text/html',
};
const defaultLogger = console;
class AgentClient {
    hc;
    sdkKey;
    wsURL;
    rpcURL;
    logger;
    constructor(config, sdkKey) {
        if (!config.baseURL)
            throw new Error('croo: baseURL is required');
        if (!sdkKey)
            throw new Error('croo: sdkKey is required');
        this.logger = config.logger ?? defaultLogger;
        this.hc = new http_client_1.HttpClient(config.baseURL, this.logger);
        this.sdkKey = sdkKey;
        this.wsURL = config.wsURL ?? '';
        this.rpcURL = config.rpcURL ?? 'https://mainnet.base.org';
    }
    sdkReq(method, path, body) {
        return { method, path, authType: 'sdk-key', authVal: this.sdkKey, body };
    }
    // --- Order Negotiation ---
    async negotiateOrder(req) {
        const resp = await this.hc.do(this.sdkReq('POST', '/orders/negotiate', req));
        this.logger.info('negotiation created', {
            negotiationId: resp.negotiation.negotiationId,
            serviceId: req.serviceId,
            status: resp.negotiation.status,
        });
        return resp.negotiation;
    }
    /**
     * Accepts a negotiation (called by Provider). After acceptance, the backend
     * automatically builds and submits a createOrder on-chain transaction.
     *
     * Use {@link acceptNegotiationWithFundAddress} instead when the underlying
     * service has require_fund_transfer=true — the backend rejects accepts that
     * omit provider_fund_address for those services.
     */
    async acceptNegotiation(negotiationId) {
        const resp = await this.hc.do(this.sdkReq('POST', `/orders/negotiate/${negotiationId}/accept`));
        this.logger.info('negotiation accepted', {
            negotiationId,
            orderId: resp.order.orderId,
            orderStatus: resp.order.status,
        });
        return resp;
    }
    /**
     * Accepts a fund-transfer negotiation, declaring the provider-side address
     * that the requester's pay tx batch will transfer fundAmount of fundToken
     * into. providerFundAddress must be a valid EVM address; the backend
     * rejects empty or malformed values for services with
     * require_fund_transfer=true.
     *
     * For non-fund services, use {@link acceptNegotiation} — the backend
     * rejects this method's non-empty provider_fund_address on those services.
     */
    async acceptNegotiationWithFundAddress(negotiationId, providerFundAddress) {
        const resp = await this.hc.do(this.sdkReq('POST', `/orders/negotiate/${negotiationId}/accept`, {
            providerFundAddress,
        }));
        this.logger.info('negotiation accepted (fund)', {
            negotiationId,
            orderId: resp.order.orderId,
            orderStatus: resp.order.status,
            providerFundAddress,
        });
        return resp;
    }
    async rejectNegotiation(negotiationId, reason) {
        await this.hc.do(this.sdkReq('POST', `/orders/negotiate/${negotiationId}/reject`, { reason }));
        this.logger.info('negotiation rejected', { negotiationId, reason });
    }
    async getNegotiation(negotiationId) {
        const resp = await this.hc.do(this.sdkReq('GET', `/orders/negotiate/${negotiationId}`));
        this.logger.info('got negotiation', { negotiationId, status: resp.negotiation.status });
        return resp.negotiation;
    }
    async listNegotiations(opts) {
        const page = opts?.page ?? 1;
        const pageSize = opts?.pageSize ?? 20;
        const resp = await this.hc.do({
            ...this.sdkReq('GET', '/orders/negotiate'),
            query: (0, http_client_1.buildQuery)(page, pageSize, {
                role: opts?.role,
                agent_id: opts?.agentId,
                status: opts?.status,
            }),
        });
        this.logger.info('listed negotiations', { count: resp.negotiations?.length ?? 0 });
        return resp.negotiations ?? [];
    }
    // --- Order Lifecycle ---
    async getOrder(orderId) {
        const resp = await this.hc.do(this.sdkReq('GET', `/orders/${orderId}`));
        this.logger.info('got order', { orderId, status: resp.order.status });
        return resp.order;
    }
    async listOrders(opts) {
        const page = opts?.page ?? 1;
        const pageSize = opts?.pageSize ?? 20;
        const resp = await this.hc.do({
            ...this.sdkReq('GET', '/orders'),
            query: (0, http_client_1.buildQuery)(page, pageSize, {
                role: opts?.role,
                agent_id: opts?.agentId,
                status: opts?.status,
            }),
        });
        this.logger.info('listed orders', { count: resp.orders?.length ?? 0 });
        return resp.orders ?? [];
    }
    async payOrder(orderId) {
        // Pre-check: query on-chain ERC-20 balance to fail fast.
        const order = await this.getOrder(orderId);
        await (0, balance_1.checkERC20Balance)(this.rpcURL, order.requesterWalletAddress, order.paymentToken, order.price);
        const resp = await this.hc.do(this.sdkReq('POST', `/orders/${orderId}/pay`));
        this.logger.info('order paid', {
            orderId,
            txHash: resp.txHash,
            status: resp.order.status,
        });
        return resp;
    }
    async deliverOrder(orderId, req) {
        const resp = await this.hc.do(this.sdkReq('POST', `/orders/${orderId}/deliver`, req));
        this.logger.info('order delivered', {
            orderId,
            txHash: resp.txHash,
            deliveryId: resp.delivery.deliveryId,
        });
        return resp;
    }
    async rejectOrder(orderId, reason) {
        await this.hc.do(this.sdkReq('POST', `/orders/${orderId}/reject`, { reason }));
        this.logger.info('order rejected', { orderId, reason });
    }
    async getDelivery(orderId) {
        const resp = await this.hc.do(this.sdkReq('GET', `/orders/${orderId}/delivery`));
        this.logger.info('got delivery', {
            orderId,
            deliveryId: resp.delivery.deliveryId,
            status: resp.delivery.status,
        });
        return resp.delivery;
    }
    // --- Object Storage ---
    async uploadFile(fileName, body) {
        const ext = (0, path_1.extname)(fileName).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        // Step 1: Get presigned upload URL
        const uploadResp = await this.hc.do(this.sdkReq('POST', '/objects/upload-url', {
            file_name: fileName,
            content_type: contentType,
        }));
        this.logger.info('got upload url', { fileName, objectKey: uploadResp.objectKey });
        // Step 2: Upload file via HTTP PUT to presigned URL
        const putResp = await fetch(uploadResp.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': contentType },
            body: body,
        });
        if (!putResp.ok) {
            const text = await putResp.text();
            throw new Error(`croo: upload failed (HTTP ${putResp.status}): ${text}`);
        }
        this.logger.info('file uploaded', { fileName, objectKey: uploadResp.objectKey });
        return uploadResp.objectKey;
    }
    async getDownloadURL(objectKey) {
        const resp = await this.hc.do(this.sdkReq('POST', '/objects/download-url', { object_key: objectKey }));
        this.logger.info('got download url', { objectKey });
        return resp.downloadUrl;
    }
    // --- WebSocket ---
    async connectWebSocket() {
        if (!this.wsURL) {
            throw new Error('croo: wsURL is required for WebSocket connection');
        }
        const stream = new ws_1.EventStream(this.sdkKey, this.wsURL, this.logger);
        await stream.connect();
        return stream;
    }
}
exports.AgentClient = AgentClient;
