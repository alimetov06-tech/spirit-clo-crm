"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatRubles } from "@/lib/formatters";

const palette = ["#2F2C29", "#64746A", "#9B6A55", "#B4935D", "#7A8B80", "#C2A77B"];

export function SummaryCharts({
  cashflow,
  expenseCategories,
  garmentTypes,
  clientDynamics
}: {
  cashflow: Array<{ label: string; income: number; expenses: number; profit: number }>;
  expenseCategories: Array<{ name: string; value: number }>;
  garmentTypes: Array<{ name: string; value: number }>;
  clientDynamics: Array<{ label: string; clients: number; orders: number }>;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <ChartFrame title="Доходы, расходы и прибыль">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={cashflow}>
            <CartesianGrid stroke="#E5DDD1" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}к`} />
            <Tooltip formatter={(value) => formatRubles(Number(value))} />
            <Area type="monotone" dataKey="income" name="Доходы" stroke="#64746A" fill="#64746A" fillOpacity={0.16} />
            <Area type="monotone" dataKey="expenses" name="Расходы" stroke="#9B6A55" fill="#9B6A55" fillOpacity={0.14} />
            <Area type="monotone" dataKey="profit" name="Прибыль" stroke="#2F2C29" fill="#2F2C29" fillOpacity={0.12} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Расходы по категориям">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={expenseCategories} dataKey="value" nameKey="name" outerRadius={108} innerRadius={56} paddingAngle={2}>
              {expenseCategories.map((entry, index) => (
                <Cell key={entry.name} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatRubles(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Изделия по популярности">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={garmentTypes} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid stroke="#E5DDD1" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={96} />
            <Tooltip />
            <Bar dataKey="value" name="Количество" radius={[0, 6, 6, 0]} fill="#2F2C29" />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Клиенты и заказы">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={clientDynamics}>
            <CartesianGrid stroke="#E5DDD1" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="clients" name="Новые клиенты" radius={[6, 6, 0, 0]} fill="#64746A" />
            <Bar dataKey="orders" name="Заказы" radius={[6, 6, 0, 0]} fill="#B4935D" />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}

function ChartFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-graphite/10 bg-white/70 p-5 shadow-soft">
      <h2 className="mb-4 text-lg font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}
