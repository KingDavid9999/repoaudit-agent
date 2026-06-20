export declare class APIError extends Error {
    httpStatus: number;
    code: number;
    reason: string;
    constructor(httpStatus: number, code: number, reason: string, message: string);
}
export declare class InsufficientBalanceError extends Error {
    token: string;
    required: bigint;
    balance: bigint;
    constructor(token: string, required: bigint, balance: bigint);
}
export declare function isNotFound(err: unknown): err is APIError;
export declare function isUnauthorized(err: unknown): err is APIError;
export declare function isInvalidParams(err: unknown): err is APIError;
export declare function isInvalidStatus(err: unknown): err is APIError;
export declare function isForbidden(err: unknown): err is APIError;
export declare function isInsufficientBalance(err: unknown): err is InsufficientBalanceError;
