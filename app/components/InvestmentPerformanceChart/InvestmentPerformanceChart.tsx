// components/InvestmentPerformanceChart/InvestmentPerformanceChart.tsx
'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import styles from './InvestmentPerformanceChart.module.scss';

interface PerformanceData {
  month: string;
  value: number;
  return: number;
  returnPercentage: number;
}

interface InvestmentPerformanceChartProps {
  data: PerformanceData[];
  height?: number;
}

export default function InvestmentPerformanceChart({ data, height = 200 }: InvestmentPerformanceChartProps) {
  if (!data.length) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const totalReturn = data[data.length - 1].value - data[0].value;
  const isPositive = totalReturn >= 0;

  return (
    <div className={styles.chartContainer} style={{ height }}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitle}>
          <Activity size={16} />
          <span>Performance</span>
        </div>
        <div className={`${styles.totalReturn} ${isPositive ? styles.positive : styles.negative}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {totalReturn >= 0 ? '+' : ''}{((totalReturn / data[0].value) * 100).toFixed(2)}%
        </div>
      </div>
      
      <div className={styles.chart}>
        {data.map((point, index) => {
          const percentage = ((point.value - minValue) / (maxValue - minValue)) * 100;
          const isPositivePoint = point.returnPercentage >= 0;
          
          return (
            <motion.div
              key={point.month}
              className={styles.chartColumn}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div 
                className={`${styles.chartBar} ${isPositivePoint ? styles.positive : styles.negative}`}
                style={{ height: `${percentage}%` }}
              >
                <div className={styles.barTooltip}>
                  <strong>{point.month}</strong>
                  <span>R$ {point.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <span className={isPositivePoint ? styles.positive : styles.negative}>
                    {point.returnPercentage >= 0 ? '+' : ''}{point.returnPercentage.toFixed(2)}%
                  </span>
                </div>
              </div>
              <span className={styles.monthLabel}>{point.month}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}