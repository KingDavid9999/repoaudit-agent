import type { Logger, Event, EventTypeName } from './types';
export declare class EventStream {
    private sdkKey;
    private wsURL;
    private logger;
    private ws;
    private handlers;
    private anyHandlers;
    private closed;
    private attempt;
    private pingTimer;
    private pongTimer;
    private error;
    private abortController;
    constructor(sdkKey: string, wsURL: string, logger: Logger);
    connect(): Promise<void>;
    on(eventType: EventTypeName | string, handler: (event: Event) => void): void;
    onAny(handler: (event: Event) => void): void;
    close(): void;
    err(): Error | null;
    private dial;
    private setupListeners;
    private resetPongTimeout;
    private startPingLoop;
    private stopPingLoop;
    private reconnect;
    private dispatchMessage;
}
