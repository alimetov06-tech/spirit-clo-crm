import { archiveGeneralExpenseAction, createGeneralExpenseAction } from "@/features/expenses/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { getCurrentWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRubles } from "@/lib/formatters";
import { demoGeneralExpenses } from "@/lib/demo/data";
import { PeriodFilter } from "@/components/period-filter";
import { inPeriod, resolvePeriod, type PeriodParams, type ResolvedPeriod } from "@/lib/periods";

const categories = ["аренда", "реклама", "оборудование", "расходные материалы", "услуги", "доставка и такси", "налоги", "связь", "программное обеспечение", "прочее"];

type ExpensesSearchParams = PeriodParams & { category?: string; error?: string; message?: string };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<ExpensesSearchParams> }) {
  const workspace = await getCurrentWorkspace();
  const params = await searchParams;
  const period = resolvePeriod(params);
  const supabase = await createClient();
  if (workspace.isDemo) {
    const filtered = demoGeneralExpenses
      .filter((expense) => inPeriod(expense.expense_date, period))
      .filter((expense) => !params.category || expense.category === params.category);
    return <ExpensesView expenses={filtered} params={params} period={period} />;
  }
  let request = supabase
    .from("general_expenses")
    .select("*")
    .eq("organization_id", workspace.organizationId)
    .is("deleted_at", null)
    .gte("expense_date", period.start)
    .lte("expense_date", period.end)
    .order("expense_date", { ascending: false })
    .limit(100);
  if (params.category) request = request.eq("category", params.category);
  const { data: expensesData } = await request;
  const expenses = expensesData ?? [];
  return <ExpensesView expenses={expenses} params={params} period={period} />;
}

function ExpensesView({ expenses, params, period }: { expenses: any[]; params: ExpensesSearchParams; period: ResolvedPeriod }) {
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  return (
    <>
      <PageHeader title="Расходы" description={`Общие расходы бизнеса за период: ${period.label}. Прямые расходы заказа учитываются отдельно.`} />
      <PeriodFilter period={period} />
      {params.error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{params.error}</p> : null}
      {params.message ? <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{params.message}</p> : null}
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader><CardTitle>Добавить расход</CardTitle></CardHeader>
          <CardContent>
            <form action={createGeneralExpenseAction} className="space-y-4">
              <Field label="Дата"><Input name="expense_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
              <Field label="Категория"><Select name="category">{categories.map((item) => <option key={item}>{item}</option>)}</Select></Field>
              <Field label="Описание"><Input name="description" required /></Field>
              <Field label="Сумма"><Input name="amount" inputMode="decimal" required /></Field>
              <Field label="Метод оплаты"><Select name="payment_method"><option value="cash">Наличные</option><option value="bank_transfer">Перевод</option><option value="card">Карта</option><option value="other">Другое</option></Select></Field>
              <Field label="Поставщик"><Input name="vendor" /></Field>
              <Field label="Заметки"><Textarea name="notes" /></Field>
              <Button type="submit">Сохранить расход</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Список расходов · {formatRubles(total)}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <form className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input type="hidden" name="period" value={period.preset} />
              <input type="hidden" name="start" value={period.start} />
              <input type="hidden" name="end" value={period.end} />
              <Select name="category" defaultValue={params.category ?? ""}>
                <option value="">Все категории</option>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </Select>
              <Button type="submit" variant="secondary">Фильтр</Button>
            </form>
            {expenses.map((expense) => (
              <div key={expense.id} className="grid gap-3 rounded-lg border border-graphite/10 bg-white/60 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div>
                  <p className="font-medium">{expense.description}</p>
                  <p className="text-sm text-graphite/65">{expense.category} · {formatDate(expense.expense_date)} {expense.vendor ? `· ${expense.vendor}` : ""}</p>
                </div>
                <p className="font-semibold">{formatRubles(expense.amount)}</p>
                <form action={archiveGeneralExpenseAction}>
                  <input type="hidden" name="id" value={expense.id} />
                  <Button type="submit" variant="ghost" size="sm">Архив</Button>
                </form>
              </div>
            ))}
            {!expenses.length ? <p className="text-sm text-graphite/65">Расходов пока нет.</p> : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
