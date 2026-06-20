"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsufficientBalanceError = exports.APIError = void 0;
exports.isNotFound = isNotFound;
exports.isUnauthorized = isUnauthorized;
exports.isInvalidParams = isInvalidParams;
exports.isInvalidStatus = isInvalidStatus;
exports.isForbidden = isForbidden;
exports.isInsufficientBalance = isInsufficientBalance;
class APIError extends Error {
    httpStatus;
    code;
    reason;
    constructor(httpStatus, code, reason, message) {
        super(`croo: ${reason} (code=${code}, http=${httpStatus}): ${message}`);
        this.name = 'APIError';
        this.httpStatus = httpStatus;
        this.code = code;
        this.reason = reason;
    }
}
exports.APIError = APIError;
class InsufficientBalanceError extends Error {
    token;
    required;
    balance;
    constructor(token, required, balance) {
        super(`croo: insufficient balance for token ${token}: required ${required.toString()}, available ${balance.toString()}`);
        this.name = 'InsufficientBalanceError';
        this.token = token;
        this.required = required;
        this.balance = balance;
    }
}
exports.InsufficientBalanceError = InsufficientBalanceError;
function isNotFound(err) {
    return err instanceof APIError && err.reason.endsWith('_NOT_FOUND');
}
function isUnauthorized(err) {
    return (err instanceof APIError &&
        ['SDK_KEY_INVALID', 'SDK_KEY_MISSING', 'AUTH_FAIL', 'NOT_LOGIN'].includes(err.reason));
}
function isInvalidParams(err) {
    return err instanceof APIError && err.reason === 'INVALID_PARAMETERS';
}
function isInvalidStatus(err) {
    return (err instanceof APIError &&
        ['INVALID_STATUS', 'INVALID_AGENT_STATUS'].includes(err.reason));
}
function isForbidden(err) {
    return err instanceof APIError && err.reason === 'FORBIDDEN';
}
function isInsufficientBalance(err) {
    return err instanceof InsufficientBalanceError;
}
