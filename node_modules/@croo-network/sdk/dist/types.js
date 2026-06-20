"use strict";
// --- Deliverable ---
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventType = exports.DeliveryStatus = exports.OrderStatus = exports.NegotiationStatus = exports.DeliverableType = void 0;
exports.DeliverableType = {
    Text: 'text',
    Schema: 'schema',
};
exports.NegotiationStatus = {
    Pending: 'pending',
    Accepted: 'accepted',
    Rejected: 'rejected',
    Expired: 'expired',
};
exports.OrderStatus = {
    Creating: 'creating',
    Created: 'created',
    Paying: 'paying',
    Paid: 'paid',
    Delivering: 'delivering',
    Completed: 'completed',
    Rejecting: 'rejecting',
    Rejected: 'rejected',
    Expired: 'expired',
    CreateFailed: 'create_failed',
    PayFailed: 'pay_failed',
    DeliverFailed: 'deliver_failed',
};
exports.DeliveryStatus = {
    Submitted: 'submitted',
    Accepted: 'accepted',
    Rejected: 'rejected',
};
// --- WebSocket Events ---
exports.EventType = {
    NegotiationCreated: 'order_negotiation_created',
    NegotiationRejected: 'order_negotiation_rejected',
    NegotiationExpired: 'order_negotiation_expired',
    OrderCreated: 'order_created',
    OrderPaid: 'order_paid',
    OrderCompleted: 'order_completed',
    OrderRejected: 'order_rejected',
    OrderExpired: 'order_expired',
};
