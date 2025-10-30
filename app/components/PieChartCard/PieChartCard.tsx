// PieChartCard.tsx

'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart as PieChartIcon } from 'lucide-react';
import styles from './PieChartCard.module.scss';
import { Transaction } from '../TransactionsTable/TransactionsTable';

interface PieChartProps {
  transactions: Transaction[];
  title?: string;
  loading?: boolean;
  onCategorySelect?: (category: string | null) => void;
  currency: string; // Nova prop para a moeda
}

// Paleta de cores profissional e acessível
const PROFESSIONAL_COLORS = [
  '#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', 
  '#ec4899', '#14b8a6', '#84cc16', '#f97316', '#06b6d4'
];

// Tipagem para dados do gráfico
interface ChartData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

// Função auxiliar para garantir que o valor seja número
const ensureNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove caracteres não numéricos exceto ponto e vírgula
    const cleaned = value.replace(/[^\d,.-]/g, '');
    // Substitui vírgula por ponto para parseFloat
    const normalized = cleaned.replace(',', '.');
    return parseFloat(normalized) || 0;
  }
  return 0;
};

// Hook para cálculos de dados
const useChartData = (transactions: Transaction[]) => {
  return useMemo(() => {
    const categoryMap: Record<string, number> = {};
    let totalExpenses = 0;

    // Processar transações
    transactions
      .filter(transaction => transaction.type === 'expense')
      .forEach(transaction => {
        const category = transaction.category?.trim() || 'Outras';
        const amount = ensureNumber(transaction.amount);
        categoryMap[category] = (categoryMap[category] || 0) + amount;
        totalExpenses += amount;
      });

    // Preparar dados para o gráfico
    const chartData: ChartData[] = Object.entries(categoryMap)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value], index) => ({
        name,
        value,
        percentage: totalExpenses > 0 ? (value / totalExpenses) * 100 : 0,
        color: PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length]
      }));

    return {
      chartData,
      totalExpenses,
      categoryCount: chartData.length
    };
  }, [transactions]);
};

// Função de formatação de porcentagem
const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Componente de loading profissional
const ChartSkeleton = () => (
  <div className={styles.skeletonContainer}>
    <div className={styles.skeletonHeader}>
      <div className={styles.skeletonText}></div>
    </div>
    <div className={styles.skeletonChart}></div>
  </div>
);

export default function PieChartCard({ 
  transactions, 
  title = "Análise de Gastos por Categoria",
  loading = false,
  onCategorySelect,
  currency // Recebe a moeda como prop
}: PieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isolatedCategory, setIsolatedCategory] = useState<string | null>(null);

  const { 
    chartData, 
    totalExpenses, 
    categoryCount 
  } = useChartData(transactions);

  // Função de formatação que usa a moeda passada por prop
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Handlers com useCallback
  const handlePieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, []);

  const handlePieLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const handleLegendClick = useCallback((categoryName: string) => {
    const newIsolatedCategory = isolatedCategory === categoryName ? null : categoryName;
    setIsolatedCategory(newIsolatedCategory);
    onCategorySelect?.(newIsolatedCategory);
  }, [isolatedCategory, onCategorySelect]);

  const handleSectorClick = useCallback((data: ChartData) => {
    handleLegendClick(data.name);
  }, [handleLegendClick]);

  // Dados filtrados para isolamento de categoria
  const filteredData = useMemo(() => {
    if (!isolatedCategory) return chartData;
    
    const isolated = chartData.find(item => item.name === isolatedCategory);
    const others = chartData.filter(item => item.name !== isolatedCategory);
    const othersTotal = others.reduce((sum, item) => sum + item.value, 0);
    
    return [
      ...(isolated ? [isolated] : []),
      ...(othersTotal > 0 ? [{
        name: 'Outras Categorias',
        value: othersTotal,
        percentage: (othersTotal / totalExpenses) * 100,
        color: 'rgba(100, 100, 100, 0.3)'
      }] : [])
    ];
  }, [chartData, isolatedCategory, totalExpenses]);

  // Renderização condicional
  if (loading) {
    return <ChartSkeleton />;
  }

  const hasData = chartData.length > 0;

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Cabeçalho simplificado */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <PieChartIcon size={20} className={styles.titleIcon} />
          <h3 className={styles.title}>{title}</h3>
        </div>
      </div>

      {/* Área do gráfico */}
      <div className={styles.chartWrapper}>
        <div className={styles.chartArea}>
          <AnimatePresence mode="wait">
            {hasData ? (
              <motion.div
                key="chart"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={styles.chartContainer}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={filteredData}
                      innerRadius={80}
                      outerRadius={activeIndex !== null ? 110 : 100}
                      paddingAngle={2}
                      dataKey="value"
                      startAngle={90}
                      endAngle={450}
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth={2}
                      onMouseEnter={handlePieEnter}
                      onMouseLeave={handlePieLeave}
                      onClick={handleSectorClick}
                      labelLine={false}
                      activeIndex={activeIndex ?? undefined}
                      activeShape={(props) => (
                        <Sector
                          {...props}
                          outerRadius={props.outerRadius + 8}
                          stroke="rgba(255,255,255,0.3)"
                          strokeWidth={2}
                        />
                      )}
                    >
                      {filteredData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            filter: activeIndex === index 
                              ? `drop-shadow(0 0 12px ${entry.color}40)`
                              : 'none',
                          }}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      content={({ payload }) => (
                        <div className={styles.customTooltip}>
                          {payload?.map((entry: any, index) => (
                            <div key={index} className={styles.tooltipItem}>
                              <div 
                                className={styles.tooltipColor} 
                                style={{ background: entry.payload.color }}
                              />
                              <div className={styles.tooltipContent}>
                                <strong>{entry.name}</strong>
                                <span>
                                  {formatCurrency(entry.value)}
                                  {' • '}
                                  {formatPercentage((entry.value / totalExpenses) * 100)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Label central */}
                <div className={styles.centerLabel}>
                  {activeIndex !== null && filteredData[activeIndex] ? (
                    <>
                      <span>{filteredData[activeIndex].name}</span>
                      <strong>
                        {formatCurrency(filteredData[activeIndex].value)}
                      </strong>
                      <small className={styles.percentSmall}>
                        ({formatPercentage(filteredData[activeIndex].percentage)})
                      </small>
                    </>
                  ) : (
                    <>
                      <span>Total Geral</span>
                      <strong>
                        {formatCurrency(totalExpenses)}
                      </strong>
                    </>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="no-data"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={styles.noDataState}
              >
                <PieChartIcon size={48} className={styles.noDataIcon} />
                <h4>Sem dados para exibir</h4>
                <p>Nenhuma despesa registrada no período</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={styles.divider}></div>

        {/* Legenda interativa */}
        <div className={styles.legendWrapper}>
          <div className={styles.legendHeader}>
            <span>Categorias</span>
            <small>{categoryCount} itens</small>
          </div>
          
          <ul className={styles.legendFull}>
            {chartData.map((item, index) => {
              const isActive = isolatedCategory === item.name;
              const isDimmed = isolatedCategory !== null && !isActive;

              return (
                <motion.li
                  key={item.name}
                  className={`${styles.legendItem} ${
                    isActive ? styles.active : ''
                  } ${isDimmed ? styles.dimmed : ''}`}
                  onClick={() => handleLegendClick(item.name)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className={styles.colorDot}
                    style={{ background: item.color }}
                  />
                  <div className={styles.legendTexts}>
                    <span className={styles.legendName}>{item.name}</span>
                    <span className={styles.legendValue}>
                      {formatCurrency(item.value)}
                      {' '}({formatPercentage(item.percentage)})
                    </span>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}