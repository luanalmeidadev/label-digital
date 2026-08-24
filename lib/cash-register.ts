export type CashSummaryInput = {
  openingBalance: number;
  cashSales: number;
  supplies: number;
  withdrawals: number;
  expenses: number;
};

export function calculateExpectedCash({
  openingBalance,
  cashSales,
  supplies,
  withdrawals,
  expenses,
}: CashSummaryInput) {
  return Number(
    (
      openingBalance +
      cashSales +
      supplies -
      withdrawals -
      expenses
    ).toFixed(2)
  );
}

export function calculateCashDifference(
  countedCash: number,
  expectedCash: number
) {
  return Number((countedCash - expectedCash).toFixed(2));
}
