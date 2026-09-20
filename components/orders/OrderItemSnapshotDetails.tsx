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

  if (!snapshot.hasConfiguration && !snapshot.hasPromotion) {
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

      {snapshot.hasPromotion && formatCurrency && (
        <p className={print ? "font-semibold" : "pt-0.5 font-medium text-brand-foreground"}>
          <span className="text-brand-muted-foreground">
            Preço normal: {formatCurrency(snapshot.baseUnitPrice ?? snapshot.unitPrice)}
          </span>
          {" • "}
          <span className="font-semibold text-brand-primary">
            Promo{snapshot.promotionalEventName ? ` "${snapshot.promotionalEventName}"` : ""}: {formatCurrency(snapshot.promotionalBaseUnitPrice ?? snapshot.unitPrice)}
          </span>
        </p>
      )}

      {showPriceBreakdown && formatCurrency && snapshot.baseUnitPrice !== null && !snapshot.hasPromotion && (
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
