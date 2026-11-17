// Registry of every resource descriptor (maintained by `php artisan nevela:generate`).
// nevela:generated:start hash=adf04d83a9f7
import beverageResource from "./beverage.resource";
import categoryResource from "./category.resource";
import orderResource from "./order.resource";
import orderItemResource from "./order-item.resource";
import postResource from "./post.resource";

export { beverageResource, categoryResource, orderResource, orderItemResource, postResource };
export const resources = [beverageResource, categoryResource, orderResource, orderItemResource, postResource] as const;

/** What a resource has beyond its fields. Read through lib/extras.ts. */
export const extras: Record<string, unknown> = {
    "Order": {
        "actions": {
            "accept": {
                "permission": "orders.accept",
                "label": "Accept",
                "icon": "check",
                "on": "record",
                "when": {
                    "status": "pending"
                },
                "set": {
                    "status": "accepted"
                }
            },
            "startPreparing": {
                "permission": "orders.start_preparing",
                "label": "Start preparing",
                "icon": "cup-soda",
                "on": "record",
                "when": {
                    "status": "accepted"
                },
                "set": {
                    "status": "preparing"
                }
            },
            "markReady": {
                "permission": "orders.mark_ready",
                "label": "Ready",
                "icon": "bell",
                "on": "record",
                "when": {
                    "status": "preparing"
                },
                "set": {
                    "status": "ready"
                }
            },
            "complete": {
                "permission": "orders.complete",
                "label": "Complete",
                "icon": "check-check",
                "on": "record",
                "when": {
                    "status": "ready"
                },
                "set": {
                    "status": "completed"
                }
            },
            "cancel": {
                "permission": "orders.cancel",
                "label": "Cancel order",
                "icon": "x",
                "on": "record",
                "confirm": "Cancel this order?",
                "when": {
                    "status": [
                        "pending",
                        "accepted",
                        "preparing",
                        "ready"
                    ]
                },
                "fields": {
                    "reason": {
                        "kind": "text",
                        "required": false
                    }
                },
                "set": {
                    "status": "cancelled"
                }
            },
            "callOff": {
                "permission": "orders.call_off",
                "label": "Cancel with a reason",
                "icon": "ban",
                "on": "record",
                "when": {
                    "status": [
                        "pending",
                        "accepted",
                        "preparing",
                        "ready"
                    ]
                },
                "fields": {
                    "reason": {
                        "kind": "text"
                    }
                },
                "set": {
                    "status": "cancelled"
                }
            }
        },
        "fixed": true,
        "items": {
            "resource": "OrderItem",
            "field": "orderId"
        }
    },
    "Post": {
        "publish": "publishedAt",
        "blog": "/blog"
    }
};
// nevela:generated:end
