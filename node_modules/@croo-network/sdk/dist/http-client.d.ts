import type { Logger } from './types';
export type AuthType = 'none' | 'sdk-key';
export interface HttpRequest {
    method: string;
    path: string;
    query?: Record<string, string>;
    body?: any;
    authType?: AuthType;
    authVal?: string;
}
export declare class HttpClient {
    private base;
    private logger;
    constructor(baseURL: string, logger: Logger);
    do<T = any>(req: HttpRequest): Promise<T | undefined>;
}
export declare function buildQuery(page: number, pageSize: number, extras?: Record<string, string | undefined>): Record<string, string>;
