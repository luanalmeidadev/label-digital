import {
  getOrderItemOptionLabel,
  normalizeOrderItemSnapshot,
  type OrderItemSnapshotInput,
} from "@/lib/order-item-display";

type OrderItemSnapshotDetailsProps = {
  item: OrderItemSnapshotInput;
  formatCurrency?: (value: number) => string;
  print?: boolean;
  showPriceBreakdown?: boolean;
};

export default function OrderItemSnapshotDetails({
  item,
  formatCurrency,
  print = false,
  showPriceBreakdown = false,
}: OrderItemSnapshotDetailsProps) {
  const snapshot = normalizeOrderItemSnapshot(item);

  if (!snapshot.hasConfiguration) {
    return null;
  }

  return (
    <div className={print ? "mt-1 space-y-0.5 text-xs" : "mt-2 space-y-1 text-xs text-brand-muted-foreground"}>
      {snapshot.variantName && (
        <p>
          {print ? snapshot.variantName : `Variante: ${snapshot.variantName}`}
        </p>
      )}

      {snapshot.options.map((option, index) => (
        <p key={option.id ?? `${option.groupName}-${option.optionName}-${index}`}>
          {print && option.presentationMode === "choice"
            ? option.optionName
            : getOrderItemOptionLabel(option)}
          {option.priceDelta > 0 && formatCurrency
            ? ` (${formatCurrency(option.priceDelta)})`
            : ""}
        </p>
      ))}

      {snapshot.itemNotes && (
        <p className="whitespace-pre-wrap">
          <span className="font-semibold">Obs:</span> {snapshot.itemNotes}
        </p>
      )}

      {showPriceBreakdown && formatCurrency && snapshot.baseUnitPrice !== null && (
        <p className="pt-1 font-semibold text-brand-foreground">
          Base {formatCurrency(snapshot.baseUnitPrice)}
          {snapshot.optionsUnitPrice > 0
            ? ` + adicionais ${formatCurrency(snapshot.optionsUnitPrice)}`
            : ""}
          {` = ${formatCurrency(snapshot.unitPrice)} cada`}
        </p>
      )}
    </div>
  );
}
