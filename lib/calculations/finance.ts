export type OrderItemAmount = {
  quantity: number;
  unitPrice: number;
};

export type PaymentAmount = {
  amount: number;
  type: "prepayment" | "final_payment" | "additional_payment" | "refund";
  voided?: boolean;
};

export function finalOrderTotal(items: OrderItemAmount[], discountAmount = 0) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return Math.max(0, roundMoney(subtotal - discountAmount));
}

export function paidTotal(payments: PaymentAmount[]) {
  return roundMoney(
    payments
      .filter((payment) => !payment.voided)
      .reduce((sum, payment) => sum + (payment.type === "refund" ? -payment.amount : payment.amount), 0)
  );
}

export function balanceDue(total: number, paid: number) {
  return roundMoney(Math.max(0, total - paid));
}

export function directCostTotal(expenses: { amount: number; deleted?: boolean }[]) {
  return roundMoney(expenses.filter((expense) => !expense.deleted).reduce((sum, expense) => sum + expense.amount, 0));
}

export function grossProfit(finalTotal: number, directCost: number) {
  return roundMoney(finalTotal - directCost);
}

export function marginPercent(finalTotal: number, profit: number) {
  if (finalTotal <= 0) return 0;
  return roundMoney((profit / finalTotal) * 100);
}

export function periodProfit(revenue: number, directCosts: number, generalExpenses: number) {
  return roundMoney(revenue - directCosts - generalExpenses);
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
