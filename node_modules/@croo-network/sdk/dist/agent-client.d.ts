import { Readable } from 'stream';
import { EventStream } from './ws';
import type { Config, Negotiation, NegotiateOrderRequest, AcceptNegotiationResult, Order, PayOrderResult, Delivery, DeliverOrderRequest, DeliverOrderResult, ListOptions } from './types';
export declare class AgentClient {
    private hc;
    private sdkKey;
    private wsURL;
    private rpcURL;
    private logger;
    constructor(config: Config, sdkKey: string);
    private sdkReq;
    negotiateOrder(req: NegotiateOrderRequest): Promise<Negotiation>;
    /**
     * Accepts a negotiation (called by Provider). After acceptance, the backend
     * automatically builds and submits a createOrder on-chain transaction.
     *
     * Use {@link acceptNegotiationWithFundAddress} instead when the underlying
     * service has require_fund_transfer=true — the backend rejects accepts that
     * omit provider_fund_address for those services.
     */
    acceptNegotiation(negotiationId: string): Promise<AcceptNegotiationResult>;
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
    acceptNegotiationWithFundAddress(negotiationId: string, providerFundAddress: string): Promise<AcceptNegotiationResult>;
    rejectNegotiation(negotiationId: string, reason: string): Promise<void>;
    getNegotiation(negotiationId: string): Promise<Negotiation>;
    listNegotiations(opts?: ListOptions): Promise<Negotiation[]>;
    getOrder(orderId: string): Promise<Order>;
    listOrders(opts?: ListOptions): Promise<Order[]>;
    payOrder(orderId: string): Promise<PayOrderResult>;
    deliverOrder(orderId: string, req: DeliverOrderRequest): Promise<DeliverOrderResult>;
    rejectOrder(orderId: string, reason: string): Promise<void>;
    getDelivery(orderId: string): Promise<Delivery>;
    uploadFile(fileName: string, body: Buffer | Readable | ReadableStream): Promise<string>;
    getDownloadURL(objectKey: string): Promise<string>;
    connectWebSocket(): Promise<EventStream>;
}
