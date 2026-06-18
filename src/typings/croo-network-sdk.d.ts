declare module "@croo-network/sdk" {
  export interface Config {
    baseURL: string;
    wsURL?: string;
    rpcURL?: string;
  }

  export interface Event {
    type: string;
    negotiation_id?: string;
    order_id?: string;
    requirements?: unknown;
  }

  export interface DeliverOrderRequest {
    deliverableType: string;
    deliverableText?: string;
  }

  export const EventType: {
    readonly NegotiationCreated: "order_negotiation_created";
    readonly NegotiationExpired: "order_negotiation_expired";
    readonly OrderPaid: "order_paid";
    readonly OrderCompleted: "order_completed";
    readonly OrderRejected: "order_rejected";
    readonly OrderExpired: "order_expired";
  };

  export const DeliverableType: {
    readonly Text: "text";
    readonly Schema: "schema";
  };

  export class AgentClient {
    constructor(config: Config, sdkKey: string);
    connectWebSocket(): Promise<EventStream>;
    acceptNegotiation(negotiationId: string): Promise<unknown>;
    deliverOrder(orderId: string, req: DeliverOrderRequest): Promise<unknown>;
    rejectOrder(orderId: string, reason: string): Promise<unknown>;
  }

  export class EventStream {
    on(event: string, handler: (e: Event) => void | Promise<void>): void;
  }
}