'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector
} from 'recharts';
import styles from './PieChartCard.module.scss';
import { Transaction } from '../TransactionsTable/TransactionsTable';

interface PieChartProps {
  transactions: Transaction[];
}

const COLORS = ['#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#ec4899', '#14b8a6'];

const generateColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const color = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '000000'.substring(0, 6 - color.length) + color;
};

export default function PieChartCard({ transactions }: PieChartProps) {
  const { expenseByCategory, totalExpenses, topExpenses } = useMemo(() => {
    const map: Record<string, number> = {};
    let total = 0;

    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = t.category || 'Outros';
        map[cat] = (map[cat] || 0) + t.amount;
        total += t.amount;
      });

    const sorted = Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      expenseByCategory: sorted,
      totalExpenses: total,
      topExpenses: sorted.slice(0, 4),
    };
  }, [transactions]);

  return (
    <div className={styles.container}>
      <div className={styles.chartArea}>
        {expenseByCategory.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <defs>
                {/* Gradiente e brilho */}
                <radialGradient id="innerGlow" cx="50%" cy="50%" r="70%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
                  <stop offset="100%" stopColor="rgba(139,92,246,0.05)" />
                </radialGradient>
              </defs>

              <Pie
                data={expenseByCategory}
                innerRadius={70}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
                startAngle={90}
                endAngle={450}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth={1.5}
                animationBegin={100}
                animationDuration={1600}
                isAnimationActive={true}
                labelLine={false}
              >
                {expenseByCategory.map((entry, i) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[i % COLORS.length] || generateColor(entry.name)}
                    style={{
                      filter:
                        'drop-shadow(0 0 4px rgba(139,92,246,0.3)) drop-shadow(0 0 10px rgba(0,0,0,0.3))',
                    }}
                  />
                ))}
              </Pie>

             <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{
                background: 'rgba(20,20,25,0.9)',
                border: '1px solid var(--glass-border)',
                borderRadius: '10px',
                boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                color: 'var(--text)',
              }}
              labelStyle={{
                color: 'var(--text)',
                fontWeight: 500,
              }}
              itemStyle={{
                color: 'var(--text)',
              }}
              formatter={(v: number, n: string) => [
                v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                n,
              ]}
            />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className={styles.noDataPlaceholder}></div>
        )}

        {/* Label central dinâmica */}
        {totalExpenses > 0 && (
          <div className={styles.centerLabel}>
            <span>Gasto total</span>
            <strong>
              {totalExpenses.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </strong>
          </div>
        )}
      </div>

      <div className={styles.legendWrapper}>
        {topExpenses.length > 0 ? (
          <ul className={styles.legendList}>
            {topExpenses.map((entry, i) => {
              const pct =
                totalExpenses > 0 ? (entry.value / totalExpenses) * 100 : 0;
              const color = COLORS[i % COLORS.length] || generateColor(entry.name);
              return (
                <li key={entry.name}>
                  <div className={styles.legendHeader}>
                    <span className={styles.colorDot} style={{ background: color }}></span>
                    {entry.name}
                    <span className={styles.percent}>{pct.toFixed(0)}%</span>
                  </div>
                  <div className={styles.legendBar}>
                    <div
                      className={styles.legendFill}
                      style={{ width: `${pct}%`, background: color }}
                    ></div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.noDataMessage}>Nenhuma despesa registrada.</p>
        )}
      </div>
    </div>
  );
}
