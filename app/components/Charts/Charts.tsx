'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import styles from './Charts.module.scss';
import { Transaction } from '../TransactionsTable/TransactionsTable';

interface ChartsProps {
  transactions: Transaction[];
}

export default function Charts({ transactions }: ChartsProps) {
  const monthlyData = useMemo(() => {
    const data: { [key: string]: { income: number; expense: number } } = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    // Inicializa os 6 últimos meses
    for (let i = 0; i < 6; i++) {
      const date = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
      const monthName = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
      data[monthName] = { income: 0, expense: 0 };
    }

    transactions.forEach((t) => {
      let transactionDate: Date | null = null;

      // Trata tanto Timestamp do Firestore quanto string ISO
      if (t.date && typeof (t.date as any).toDate === 'function') {
        transactionDate = (t.date as any).toDate();
      } else if (typeof t.date === 'string') {
        const parsed = new Date(t.date);
        if (!isNaN(parsed.getTime())) transactionDate = parsed;
      }

      if (!transactionDate) return; // ignora transações inválidas
      if (transactionDate < sixMonthsAgo) return; // ignora transações antigas

      const monthName = transactionDate.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');

      // Garante que o mês existe no objeto, mesmo se estiver fora da lista inicial
      if (!data[monthName]) {
        data[monthName] = { income: 0, expense: 0 };
      }

      if (t.type === 'income') {
        data[monthName].income += t.amount;
      } else {
        data[monthName].expense += t.amount;
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
      <h3>Balanço Mensal (Últimos 6 meses)</h3>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={monthlyData}
            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
            barSize={30}
          >
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.9} />
                <stop offset="100%" stopColor="var(--positive)" stopOpacity={0.4} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--negative)" stopOpacity={0.9} />
                <stop offset="100%" stopColor="var(--negative)" stopOpacity={0.4} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="name"
              stroke="var(--text)"
              opacity={0.8}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--text)"
              opacity={0.8}
              fontSize={12}
              tickFormatter={(value) => `R$${value / 1000}k`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            />

            <Bar
              dataKey="Receitas"
              fill="url(#incomeGradient)"
              radius={[4, 4, 0, 0]}
              animationDuration={800}
            />
            <Bar
              dataKey="Despesas"
              fill="url(#expenseGradient)"
              radius={[4, 4, 0, 0]}
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
