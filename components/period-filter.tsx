import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import type { ResolvedPeriod } from "@/lib/periods";

export function PeriodFilter({ period }: { period: ResolvedPeriod }) {
  return (
    <form className="mb-5 grid gap-3 rounded-xl border border-graphite/10 bg-white/60 p-3 md:grid-cols-[220px_1fr_1fr_auto]">
      <Select name="period" defaultValue={period.preset} aria-label="Период">
        <option value="current_month">Текущий месяц</option>
        <option value="previous_month">Прошлый месяц</option>
        <option value="last_3_months">Последние 3 месяца</option>
        <option value="current_year">Текущий год</option>
        <option value="custom">Произвольный период</option>
      </Select>
      <Input name="start" type="date" defaultValue={period.start} aria-label="Дата начала" />
      <Input name="end" type="date" defaultValue={period.end} aria-label="Дата окончания" />
      <Button type="submit" variant="secondary">Показать</Button>
    </form>
  );
}
