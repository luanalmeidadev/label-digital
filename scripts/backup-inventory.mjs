export const applicationTables = Object.freeze([
  "categories",
  "products",
  "customers",
  "addresses",
  "orders",
  "order_items",
  "cash_sessions",
  "order_payments",
  "cash_movements",
  "order_refunds",
  "product_losses",
  "admin_profiles",
  "admin_audit_logs",
  "store_settings",
  "business_hours",
  "delivery_zones",
]);

export const storageResources = Object.freeze([
  Object.freeze({ name: "product-images" }),
  Object.freeze({ name: "preorder-catalog", module: "preorders" }),
]);

export function getStorageBuckets(modules) {
  return storageResources
    .filter((resource) => !resource.module || modules[resource.module] === true)
    .map((resource) => resource.name);
}
