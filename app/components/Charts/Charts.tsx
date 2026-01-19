"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { TrendingUp } from "lucide-react";
import styles from "./Charts.module.scss";
import { Transaction } from "../TransactionsTable/TransactionsTable";

interface ChartsProps {
  transactions: Transaction[];
}

export default function Charts({ transactions }: ChartsProps) {
  const monthlyData = useMemo(() => {
    const data: { [key: string]: { income: number; expense: number } } = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    for (let i = 0; i < 6; i++) {
      const date = new Date(
        sixMonthsAgo.getFullYear(),
        sixMonthsAgo.getMonth() + i,
        1
      );
      const monthName = date
        .toLocaleString("pt-BR", { month: "short" })
        .replace(".", "");
      data[monthName] = { income: 0, expense: 0 };
    }

    transactions.forEach((t) => {
      const transactionDate =
        t.date && typeof (t.date as any).toDate === "function"
          ? (t.date as any).toDate()
          : new Date(t.date);

      const monthName = transactionDate
        .toLocaleString("pt-BR", { month: "short" })
        .replace(".", "");
      if (data[monthName]) {
        if (t.type === "income") data[monthName].income += t.amount;
        else data[monthName].expense += Math.abs(t.amount);
      }
    });

    return Object.entries(data).map(([name, values]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      Receitas: values.income,
      Despesas: values.expense,
    }));
  }, [transactions]);

  return (
    <div className={styles.container}>
      <div className={styles.chartHeader}>
        <div className={styles.iconBox}>
          <TrendingUp size={18} />
        </div>
        <h3>Fluxo Mensal</h3>
      </div>

      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={monthlyData}
            margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity={1} />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.4} />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              stroke="rgba(255,255,255,0.03)"
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 500 }}
              dy={15}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6b7280", fontSize: 11 }}
            />

            <Tooltip
              cursor={{ fill: "rgba(255, 255, 255, 0.05)", radius: 10 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className={styles.customTooltip}>
                      <span className={styles.tooltipLabel}>
                        {payload[0].payload.name}
                      </span>
                      <span className={styles.tooltipValue}>
                        R$ {payload[0].value?.toLocaleString()}
                      </span>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Bar
              dataKey="Receitas"
              fill="url(#barGradient)"
              radius={[20, 20, 20, 20]} /* Formato pílula da imagem */
              barSize={14}
            />
            <Bar
              dataKey="Despesas"
              fill="rgba(255, 255, 255, 0.1)"
              radius={[20, 20, 20, 20]}
              barSize={14}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
