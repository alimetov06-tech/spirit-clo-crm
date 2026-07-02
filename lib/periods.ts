import {
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
  subMonths
} from "date-fns";

export type PeriodPreset = "current_month" | "previous_month" | "last_3_months" | "current_year" | "custom";

export type PeriodParams = {
  period?: string;
  start?: string;
  end?: string;
};

export type ResolvedPeriod = {
  preset: PeriodPreset;
  start: string;
  end: string;
  label: string;
};

const dateFormat = "yyyy-MM-dd";

export function resolvePeriod(params: PeriodParams = {}): ResolvedPeriod {
  const today = new Date();
  const preset = isPeriodPreset(params.period) ? params.period : "current_month";

  if (preset === "custom" && params.start && params.end) {
    return {
      preset,
      start: params.start,
      end: params.end,
      label: `${formatHumanDate(params.start)} — ${formatHumanDate(params.end)}`
    };
  }

  if (preset === "previous_month") {
    const date = subMonths(today, 1);
    return {
      preset,
      start: format(startOfMonth(date), dateFormat),
      end: format(endOfMonth(date), dateFormat),
      label: "Прошлый месяц"
    };
  }

  if (preset === "last_3_months") {
    return {
      preset,
      start: format(startOfMonth(subMonths(today, 2)), dateFormat),
      end: format(today, dateFormat),
      label: "Последние три месяца"
    };
  }

  if (preset === "current_year") {
    return {
      preset,
      start: format(startOfYear(today), dateFormat),
      end: format(endOfYear(today), dateFormat),
      label: "Текущий год"
    };
  }

  return {
    preset: "current_month",
    start: format(startOfMonth(today), dateFormat),
    end: format(endOfMonth(today), dateFormat),
    label: "Текущий месяц"
  };
}

export function inPeriod(value: string | null | undefined, period: ResolvedPeriod) {
  if (!value) return false;
  const date = value.slice(0, 10);
  return date >= period.start && date <= period.end;
}

export function formatHumanDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function isPeriodPreset(value: string | undefined): value is PeriodPreset {
  return Boolean(value && ["current_month", "previous_month", "last_3_months", "current_year", "custom"].includes(value));
}
