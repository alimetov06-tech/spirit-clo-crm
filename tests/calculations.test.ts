import { describe, expect, it } from "vitest";
import {
  balanceDue,
  directCostTotal,
  finalOrderTotal,
  grossProfit,
  marginPercent,
  paidTotal,
  periodProfit
} from "@/lib/calculations/finance";

describe("финансовые расчёты", () => {
  it("считает финальную стоимость заказа со скидкой и не уходит ниже нуля", () => {
    expect(finalOrderTotal([{ quantity: 2, unitPrice: 15000 }], 5000)).toBe(25000);
    expect(finalOrderTotal([{ quantity: 1, unitPrice: 3000 }], 5000)).toBe(0);
  });

  it("учитывает оплаты, возвраты и отменённые платежи", () => {
    expect(
      paidTotal([
        { amount: 10000, type: "prepayment" },
        { amount: 5000, type: "final_payment" },
        { amount: 1000, type: "refund" },
        { amount: 9999, type: "additional_payment", voided: true }
      ])
    ).toBe(14000);
  });

  it("считает остаток, себестоимость, прибыль и рентабельность", () => {
    const costs = directCostTotal([{ amount: 7000 }, { amount: 1000, deleted: true }, { amount: 3000 }]);
    const profit = grossProfit(25000, costs);
    expect(balanceDue(25000, 14000)).toBe(11000);
    expect(costs).toBe(10000);
    expect(profit).toBe(15000);
    expect(marginPercent(25000, profit)).toBe(60);
    expect(marginPercent(0, profit)).toBe(0);
  });

  it("считает прибыль за период", () => {
    expect(periodProfit(100000, 35000, 12000)).toBe(53000);
  });
});
