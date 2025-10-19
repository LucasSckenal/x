'use client';

import { useState, useReducer, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { db, auth } from '../../lib/firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Plus, Trash2, AlertTriangle, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './Investments.module.scss';
import CustomSelect from '../CustomSelect/CustomSelect';
import CustomNumberInput from '../CustomNumberInput/CustomNumberInput';
import Modal from '../Modal/Modal';

// --- TIPOS E INTERFACES ---
export interface Investment {
  id: string;
  name: string;
  type: 'Renda Fixa' | 'Ações' | 'Fundo Imobiliário' | 'ETF' | 'Cripto' | 'Outro';
  value: number; // valor investido
  symbol?: string; // código do ativo (para ações/ETF)
}

interface InvestmentsProps {
  investments: Investment[];
}

interface PriceData {
  lastPrice: number;
  change: number; // variação em relação à última atualização
}

interface MonthlyPerformance {
  month: string;
  value: number;
  return: number;
  returnPercentage: number;
}

const investmentTypes = [
  { value: 'Renda Fixa', label: 'Renda Fixa', icon: '📊' },
  { value: 'Ações', label: 'Ações', icon: '📈' },
  { value: 'Fundo Imobiliário', label: 'Fundo Imobiliário', icon: '🏢' },
  { value: 'ETF', label: 'ETF', icon: '🧩' },
  { value: 'Cripto', label: 'Cripto', icon: '₿' },
  { value: 'Outro', label: 'Outro', icon: '●' }
];

// --- FUNÇÃO SIMULADA PARA PEGAR PREÇOS ---
async function fetchStockPrice(symbol: string): Promise<PriceData> {
  const lastPrice = Math.random() * 100 + 20;
  const change = (Math.random() - 0.5) * 2;
  return { lastPrice, change };
}

// --- FUNÇÃO PARA SIMULAR DESEMPENHO MENSAL ---
function generateMonthlyPerformance(investment: Investment): MonthlyPerformance[] {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
  let currentValue = investment.value;
  
  return months.map((month, index) => {
    // Simula diferentes taxas de retorno baseadas no tipo de investimento
    const baseRates: Record<string, number> = {
      'Renda Fixa': 0.008, // 0.8% ao mês
      'Ações': 0.012, // 1.2% ao mês
      'Fundo Imobiliário': 0.009, // 0.9% ao mês
      'ETF': 0.011, // 1.1% ao mês
      'Cripto': 0.025, // 2.5% ao mês
      'Outro': 0.006 // 0.6% ao mês
    };
    
    const volatility: Record<string, number> = {
      'Renda Fixa': 0.002,
      'Ações': 0.08,
      'Fundo Imobiliário': 0.04,
      'ETF': 0.06,
      'Cripto': 0.15,
      'Outro': 0.01
    };
    
    const baseRate = baseRates[investment.type] || 0.005;
    const vol = volatility[investment.type] || 0.05;
    
    // Retorno mensal com alguma volatilidade
    const monthlyReturn = baseRate + (Math.random() - 0.5) * vol;
    const returnAmount = currentValue * monthlyReturn;
    
    currentValue += returnAmount;
    
    return {
      month,
      value: currentValue,
      return: returnAmount,
      returnPercentage: monthlyReturn * 100
    };
  });
}

// --- COMPONENTE PRINCIPAL ---
export default function Investments({ investments }: InvestmentsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [investmentToDelete, setInvestmentToDelete] = useState<Investment | null>(null);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const user = auth.currentUser;

  // --- BUSCA PREÇOS ---
  useEffect(() => {
    async function fetchPrices() {
      const result: Record<string, PriceData> = {};
      for (const inv of investments) {
        if (inv.type === 'Ações' || inv.type === 'ETF') {
          if (!inv.symbol) continue;
          const priceData = await fetchStockPrice(inv.symbol);
          result[inv.id] = priceData;
        }
      }
      setPrices(result);
    }
    fetchPrices();
  }, [investments]);

  const totalInvested = useMemo(() => 
    investments.reduce((sum, item) => sum + item.value, 0), 
    [investments]
  );

  const handleSaveInvestment = useCallback(async (data: Omit<Investment, 'id'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, `users/${user.uid}/investments`), {
        ...data,
        value: Number(data.value)
      });
      setIsModalOpen(false);
      toast.success('Investimento adicionado!');
    } catch (error) {
      console.error("Erro ao salvar investimento: ", error);
      toast.error('Erro ao salvar investimento.');
    }
  }, [user]);

  const handleDeleteInvestment = useCallback(async () => {
    if (!user || !investmentToDelete) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/investments`, investmentToDelete.id));
      setInvestmentToDelete(null);
      toast.success('Investimento removido!');
    } catch (error) {
      console.error("Erro ao excluir investimento: ", error);
      toast.error('Erro ao remover investimento.');
    }
  }, [user, investmentToDelete]);

  const formatCurrency = useCallback((value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), []);

  const getTypeIcon = useCallback((type: string) => {
    const typeObj = investmentTypes.find(t => t.value === type);
    return typeObj ? typeObj.icon : '●';
  }, []);

  const handleInvestmentClick = useCallback((investment: Investment) => {
    setSelectedInvestment(investment);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Meus Investimentos</h2>
        <motion.button 
          className={styles.addButton} 
          onClick={() => setIsModalOpen(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={18} />
        </motion.button>
      </div>

      <motion.div className={styles.summary} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <p>Total Investido</p>
        <h3>{formatCurrency(totalInvested)}</h3>
      </motion.div>

      <div className={styles.investmentList}>
        {investments.length === 0 ? (
          <motion.p className={styles.centeredMessage} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Nenhum investimento adicionado.<br />
            <span>Comece adicionando seu primeiro investimento!</span>
          </motion.p>
        ) : (
          investments.map((item, index) => {
            const priceData = prices[item.id];
            
            return (
              <motion.div 
                key={item.id} 
                className={styles.investmentItem} 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.1 * index }} 
                whileHover={{ y: -2, boxShadow: '0 8px 25px rgba(139, 92, 246, 0.15)' }}
                onClick={() => handleInvestmentClick(item)}
              >
                <div className={styles.iconWrapper} data-type={item.type.split(' ')[0]}>
                  <span className={styles.typeIcon}>{getTypeIcon(item.type)}</span>
                </div>
                <div className={styles.itemInfo}>
                  <h4>{item.name}</h4>
                  <p>{item.type}</p>
                  {item.symbol && <span className={styles.symbol}>{item.symbol}</span>}
                </div>
                <div className={styles.itemValue}>
                  <div className={styles.valueData}>
                    <span className={styles.value}>{formatCurrency(item.value)}</span>
                    {priceData && (
                      <div className={styles.priceInfo}>
                        <span className={styles.priceLabel}>Cota: {formatCurrency(priceData.lastPrice)}</span>
                        <motion.span 
                          className={styles.priceChange}
                          style={{ 
                            color: priceData.change >= 0 ? '#16a34a' : '#dc2626',
                            backgroundColor: priceData.change >= 0 ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)'
                          }}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          {priceData.change >= 0 ? '↗' : '↘'} {Math.abs(priceData.change).toFixed(2)}%
                        </motion.span>
                      </div>
                    )}
                  </div>
                  <motion.button 
                    className={styles.deleteButton} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setInvestmentToDelete(item);
                    }} 
                    whileHover={{ scale: 1.1 }} 
                    whileTap={{ scale: 0.9 }}
                  >
                    <Trash2 size={16} />
                  </motion.button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <InvestmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveInvestment} />
      <ConfirmDeleteInvestmentModal isOpen={!!investmentToDelete} onClose={() => setInvestmentToDelete(null)} onConfirm={handleDeleteInvestment} investment={investmentToDelete} />
      <InvestmentDetailsModal 
        isOpen={!!selectedInvestment} 
        onClose={() => setSelectedInvestment(null)} 
        investment={selectedInvestment} 
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

// --- MODAL DE DETALHES DO INVESTIMENTO ---
function InvestmentDetailsModal({ isOpen, onClose, investment, formatCurrency }: any) {
  const [performanceData, setPerformanceData] = useState<MonthlyPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'chart' | 'table' | 'analysis'>('chart');
  const [chartType, setChartType] = useState<'line' | 'area'>('line');
  
  useEffect(() => {
    if (investment) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        const data = generateMonthlyPerformance(investment);
        setPerformanceData(data);
        setIsLoading(false);
      }, 800);
      
      return () => clearTimeout(timer);
    } else {
      setPerformanceData([]);
      setIsLoading(false);
    }
  }, [investment]);

  if (!investment) return null;

  // Calcular métricas
  const totalReturn = performanceData.length > 0 
    ? performanceData.reduce((sum, month) => sum + month.return, 0)
    : 0;

  const totalReturnPercentage = performanceData.length > 0 
    ? (totalReturn / investment.value) * 100 
    : 0;

  const averageMonthlyReturn = performanceData.length > 0 
    ? performanceData.reduce((sum, month) => sum + month.returnPercentage, 0) / performanceData.length 
    : 0;

  const maxValue = performanceData.length > 0 
    ? Math.max(...performanceData.map(d => d.value))
    : investment.value;

  const minValue = performanceData.length > 0 
    ? Math.min(...performanceData.map(d => d.value))
    : investment.value;

  const currentValue = performanceData.length > 0 
    ? performanceData[performanceData.length - 1].value 
    : investment.value;

  const isPositiveTrend = performanceData.length > 1 
    ? performanceData[performanceData.length - 1].value > performanceData[0].value
    : true;

  const bestMonth = performanceData.length > 0
    ? performanceData.reduce((best, current) => 
        current.returnPercentage > best.returnPercentage ? current : best, 
        performanceData[0]
      )
    : null;

  const worstMonth = performanceData.length > 0
    ? performanceData.reduce((worst, current) => 
        current.returnPercentage < worst.returnPercentage ? current : worst, 
        performanceData[0]
      )
    : null;

  // Calcular pontos para o gráfico de linha suavizada
  const calculateSmoothLinePoints = useCallback(() => {
    if (performanceData.length === 0) return '';
    
    const points = performanceData.map((month, index) => {
      const x = (index / (performanceData.length - 1)) * 100;
      const y = 100 - (((month.value - minValue) / (maxValue - minValue)) * 90 + 5);
      return { x, y };
    });

    // Algoritmo de interpolação suavizada
    let path = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const current = points[i];
      
      // Controle para curvas suaves
      const controlPoint1 = {
        x: prev.x + (current.x - prev.x) * 0.3,
        y: prev.y
      };
      
      const controlPoint2 = {
        x: prev.x + (current.x - prev.x) * 0.7,
        y: current.y
      };
      
      path += ` C ${controlPoint1.x},${controlPoint1.y} ${controlPoint2.x},${controlPoint2.y} ${current.x},${current.y}`;
    }
    
    return path;
  }, [performanceData, minValue, maxValue]);

  // Calcular área para gráfico de área
  const calculateAreaPath = useCallback(() => {
    const linePath = calculateSmoothLinePoints();
    if (!linePath) return '';
    
    return `${linePath} L 100,100 L 0,100 Z`;
  }, [calculateSmoothLinePoints]);

  // Calcular pontos para gráfico de linha simples (alternativa)
  const calculateLinePoints = useCallback(() => {
    if (performanceData.length === 0) return '';
    
    const points = performanceData.map((month, index) => {
      const x = (index / (performanceData.length - 1)) * 100;
      const y = 100 - (((month.value - minValue) / (maxValue - minValue)) * 90 + 5);
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  }, [performanceData, minValue, maxValue]);

  // Calcular grade de referência
  const gridLines = useMemo(() => {
    if (performanceData.length === 0 || maxValue === minValue) return [];
    
    const lines = [];
    const valueRange = maxValue - minValue;
    
    // 5 linhas horizontais
    for (let i = 0; i <= 4; i++) {
      const value = minValue + (valueRange * i) / 4;
      const y = 100 - (((value - minValue) / valueRange) * 90 + 5);
      lines.push({
        value,
        y,
        label: formatCurrency(value)
      });
    }
    
    return lines;
  }, [performanceData, minValue, maxValue, formatCurrency]);

  // Calcular estatísticas adicionais para análise
  const positiveMonths = performanceData.filter(month => month.returnPercentage >= 0).length;
  const negativeMonths = performanceData.filter(month => month.returnPercentage < 0).length;
  const successRate = performanceData.length > 0 ? (positiveMonths / performanceData.length) * 100 : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Detalhes - ${investment.name}`} size="xlarge">
      <div className={styles.detailsContent}>
        {/* Header com informações principais */}
        <div className={styles.detailsHeader}>
          <div className={styles.investmentType}>
            <span className={styles.typeBadge}>{investment.type}</span>
            {investment.symbol && <span className={styles.symbolBadge}>{investment.symbol}</span>}
          </div>
          <div className={styles.investmentStats}>
            <div className={styles.stat}>
              <DollarSign size={16} />
              <span>Valor Investido</span>
              <strong>{formatCurrency(investment.value)}</strong>
            </div>
            <div className={styles.stat}>
              <TrendingUp size={16} />
              <span>Retorno Total</span>
              <strong style={{ color: totalReturn >= 0 ? '#16a34a' : '#dc2626' }}>
                {formatCurrency(totalReturn)} ({totalReturnPercentage.toFixed(2)}%)
              </strong>
            </div>
            <div className={styles.stat}>
              <Calendar size={16} />
              <span>Retorno Médio</span>
              <strong style={{ color: averageMonthlyReturn >= 0 ? '#16a34a' : '#dc2626' }}>
                {averageMonthlyReturn.toFixed(2)}%
              </strong>
            </div>
          </div>
        </div>

        {/* Tabs de Navegação */}
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'chart' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('chart')}
          >
            📊 Gráfico
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'table' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('table')}
          >
            📋 Tabela
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'analysis' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            🔍 Análise
          </button>
        </div>

        {/* Conteúdo das Tabs - Foco no Gráfico Melhorado */}
        {activeTab === 'chart' && (
          <div className={styles.performanceChart}>
            <div className={styles.chartHeader}>
              <h4>Evolução dos Últimos 6 Meses</h4>
              <div className={styles.chartControls}>
                <button 
                  className={`${styles.chartTypeButton} ${chartType === 'line' ? styles.activeChartType : ''}`}
                  onClick={() => setChartType('line')}
                >
                  📈 Linha
                </button>
                <button 
                  className={`${styles.chartTypeButton} ${chartType === 'area' ? styles.activeChartType : ''}`}
                  onClick={() => setChartType('area')}
                >
                  🗂 Área
                </button>
              </div>
            </div>
            
            <div className={styles.lineChartContainer}>
              {isLoading ? (
                <div className={styles.loadingState}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className={styles.loadingSpinner}
                  />
                  <p>Carregando dados de performance...</p>
                </div>
              ) : performanceData.length > 0 ? (
                <div className={styles.lineChart}>
                  {/* Eixo Y com valores */}
                  <div className={styles.yAxis}>
                    {gridLines.map((line, index) => (
                      <div key={index} className={styles.yTick} style={{ bottom: `${line.y}%` }}>
                        <span className={styles.yLabel}>{line.label}</span>
                        <div className={styles.gridLine} />
                      </div>
                    ))}
                  </div>
                  
                  {/* Área do SVG com gráfico interativo */}
                  <div className={styles.chartSvgContainer}>
                    <svg 
                      viewBox="0 0 100 100" 
                      preserveAspectRatio="none"
                      className={styles.lineSvg}
                    >
                      <defs>
                        {/* Gradiente para área */}
                        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor={isPositiveTrend ? '#16a34a40' : '#dc262640'} />
                          <stop offset="100%" stopColor={isPositiveTrend ? '#16a34a05' : '#dc262605'} />
                        </linearGradient>
                        
                        {/* Gradiente para linha */}
                        <linearGradient id="lineStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor={isPositiveTrend ? '#16a34a' : '#dc2626'} />
                          <stop offset="50%" stopColor={isPositiveTrend ? '#22c55e' : '#ef4444'} />
                          <stop offset="100%" stopColor={isPositiveTrend ? '#4ade80' : '#f87171'} />
                        </linearGradient>

                        {/* Padrão de grid */}
                        <pattern id="gridPattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--glass-border)" strokeWidth="0.5"/>
                        </pattern>
                      </defs>
                      
                      {/* Grade de fundo */}
                      <rect width="100" height="100" fill="url(#gridPattern)" opacity="0.3" />
                      
                      {/* Linhas de referência */}
                      {gridLines.map((line, index) => (
                        <line
                          key={`grid-${index}`}
                          x1="0"
                          y1={line.y}
                          x2="100"
                          y2={line.y}
                          stroke="var(--glass-border)"
                          strokeWidth="0.3"
                          strokeDasharray="1,2"
                        />
                      ))}
                      
                      {/* Área preenchida (para gráfico de área) */}
                      {chartType === 'area' && (
                        <motion.path
                          d={calculateAreaPath()}
                          fill="url(#areaGradient)"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                      )}
                      
                      {/* Linha principal */}
                      <motion.path
                        d={chartType === 'area' ? calculateSmoothLinePoints() : calculateLinePoints()}
                        fill="none"
                        stroke="url(#lineStroke)"
                        strokeWidth={chartType === 'area' ? "2" : "3"}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                      />
                      
                      {/* Pontos de dados interativos */}
                      {performanceData.map((month, index) => {
                        const x = (index / (performanceData.length - 1)) * 100;
                        const y = 100 - (((month.value - minValue) / (maxValue - minValue)) * 90 + 5);
                        
                        return (
                          <g key={month.month}>
                            {/* Efeito de glow no hover */}
                            <motion.circle
                              cx={x}
                              cy={y}
                              r="8"
                              fill={isPositiveTrend ? '#16a34a' : '#dc2626'}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ 
                                scale: hoveredPoint === index ? 1.2 : 0,
                                opacity: hoveredPoint === index ? 0.2 : 0
                              }}
                              transition={{ duration: 0.2 }}
                            />
                            
                            {/* Ponto principal com animação */}
                            <motion.circle
                              cx={x}
                              cy={y}
                              r="4"
                              fill={isPositiveTrend ? '#16a34a' : '#dc2626'}
                              stroke="#fff"
                              strokeWidth="2"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ 
                                delay: index * 0.1 + 0.5, 
                                duration: 0.3,
                                type: "spring",
                                stiffness: 200
                              }}
                              onMouseEnter={() => setHoveredPoint(index)}
                              onMouseLeave={() => setHoveredPoint(null)}
                              className={styles.dataPoint}
                              whileHover={{ 
                                scale: 1.3,
                                strokeWidth: "3"
                              }}
                            />
                          </g>
                        );
                      })}
                      
                      {/* Linha de tendência */}
                      {performanceData.length > 1 && (
                        <motion.line
                          x1="0"
                          y1={100 - (((performanceData[0].value - minValue) / (maxValue - minValue)) * 90 + 5)}
                          x2="100"
                          y2={100 - (((performanceData[performanceData.length - 1].value - minValue) / (maxValue - minValue)) * 90 + 5)}
                          stroke={isPositiveTrend ? '#16a34a' : '#dc2626'}
                          strokeWidth="0.5"
                          strokeDasharray="3,2"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.5 }}
                          transition={{ delay: 1.5, duration: 0.5 }}
                        />
                      )}
                    </svg>
                    
                    {/* Tooltip flutuante */}
                    {hoveredPoint !== null && performanceData[hoveredPoint] && (
                      <motion.div 
                        className={styles.lineTooltip}
                        style={{
                          left: `${(hoveredPoint / (performanceData.length - 1)) * 100}%`,
                        }}
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <div className={styles.tooltipArrow} />
                        <div className={styles.tooltipContent}>
                          <div className={styles.tooltipHeader}>
                            <strong>{performanceData[hoveredPoint].month}</strong>
                            <span 
                              className={styles.tooltipReturn}
                              style={{ 
                                color: performanceData[hoveredPoint].return >= 0 ? '#16a34a' : '#dc2626'
                              }}
                            >
                              {performanceData[hoveredPoint].return >= 0 ? '↗' : '↘'}
                              {performanceData[hoveredPoint].returnPercentage.toFixed(2)}%
                            </span>
                          </div>
                          <div className={styles.tooltipBody}>
                            <div className={styles.tooltipRow}>
                              <span>Valor:</span>
                              <strong>{formatCurrency(performanceData[hoveredPoint].value)}</strong>
                            </div>
                            <div className={styles.tooltipRow}>
                              <span>Retorno:</span>
                              <strong style={{ 
                                color: performanceData[hoveredPoint].return >= 0 ? '#16a34a' : '#dc2626'
                              }}>
                                {performanceData[hoveredPoint].return >= 0 ? '+' : ''}
                                {formatCurrency(performanceData[hoveredPoint].return)}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Eixo X com meses */}
                  <div className={styles.xAxis}>
                    {performanceData.map((month, index) => (
                      <div 
                        key={month.month} 
                        className={styles.xTick}
                        style={{ 
                          left: `${(index / (performanceData.length - 1)) * 100}%`,
                        }}
                      >
                        <span className={styles.xLabel}>{month.month}</span>
                        {/* Marcador no eixo X */}
                        <div 
                          className={styles.xMarker}
                          style={{ 
                            backgroundColor: hoveredPoint === index ? 
                              (isPositiveTrend ? '#16a34a' : '#dc2626') : 'var(--muted)'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <TrendingUp size={48} className={styles.emptyIcon} />
                  <p>Nenhum dado de performance disponível</p>
                  <span>Os dados de performance serão gerados automaticamente</span>
                </div>
              )}
            </div>

            {/* Legenda e informações do gráfico */}
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <div 
                  className={styles.legendColor}
                  style={{ backgroundColor: isPositiveTrend ? '#16a34a' : '#dc2626' }}
                />
                <span>Valor do Investimento</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendLine} />
                <span>Tendência {isPositiveTrend ? 'Positiva' : 'Negativa'}</span>
              </div>
              <div className={styles.performanceIndicator}>
                <span>Performance: </span>
                <strong style={{ color: totalReturnPercentage >= 0 ? '#16a34a' : '#dc2626' }}>
                  {totalReturnPercentage >= 0 ? '✅ ' : '❌ '}
                  {totalReturnPercentage.toFixed(2)}%
                </strong>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'table' && (
          <div className={styles.performanceTable}>
            <h4>Performance Mensal Detalhada</h4>
            <div className={styles.tableContainer}>
              {isLoading ? (
                <div className={styles.loadingState}>
                  <p>Carregando dados...</p>
                </div>
              ) : performanceData.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th>Valor Acumulado</th>
                      <th>Retorno (R$)</th>
                      <th>Retorno (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceData.map((month) => (
                      <tr key={month.month}>
                        <td>
                          <span className={styles.monthBadge}>{month.month}</span>
                        </td>
                        <td>
                          <strong>{formatCurrency(month.value)}</strong>
                        </td>
                        <td style={{ color: month.return >= 0 ? '#16a34a' : '#dc2626' }}>
                          <div className={styles.returnCell}>
                            {month.return >= 0 ? '↗' : '↘'}
                            {formatCurrency(month.return)}
                          </div>
                        </td>
                        <td style={{ color: month.returnPercentage >= 0 ? '#16a34a' : '#dc2626' }}>
                          <div className={styles.returnCell}>
                            {month.returnPercentage >= 0 ? '+' : ''}{month.returnPercentage.toFixed(2)}%
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={styles.emptyState}>
                  <p>Nenhum dado disponível</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className={styles.analysisTab}>
            <h4>Análise de Performance</h4>
            <div className={styles.analysisGrid}>
              <div className={styles.analysisCard}>
                <h5>📈 Estatísticas Gerais</h5>
                <div className={styles.statsList}>
                  <div className={styles.statItem}>
                    <span>Meses Positivos</span>
                    <strong style={{ color: '#16a34a' }}>{positiveMonths}</strong>
                  </div>
                  <div className={styles.statItem}>
                    <span>Meses Negativos</span>
                    <strong style={{ color: '#dc2626' }}>{negativeMonths}</strong>
                  </div>
                  <div className={styles.statItem}>
                    <span>Taxa de Sucesso</span>
                    <strong style={{ color: successRate >= 50 ? '#16a34a' : '#dc2626' }}>
                      {successRate.toFixed(1)}%
                    </strong>
                  </div>
                </div>
              </div>

              <div className={styles.analysisCard}>
                <h5>⭐ Melhor Mês</h5>
                {bestMonth ? (
                  <div className={styles.bestWorstMonth}>
                    <span className={styles.monthName}>{bestMonth.month}</span>
                    <strong style={{ color: '#16a34a' }}>
                      +{bestMonth.returnPercentage.toFixed(2)}%
                    </strong>
                    <span className={styles.monthValue}>
                      {formatCurrency(bestMonth.return)}
                    </span>
                  </div>
                ) : (
                  <p>Nenhum dado disponível</p>
                )}
              </div>

              <div className={styles.analysisCard}>
                <h5>📉 Pior Mês</h5>
                {worstMonth ? (
                  <div className={styles.bestWorstMonth}>
                    <span className={styles.monthName}>{worstMonth.month}</span>
                    <strong style={{ color: '#dc2626' }}>
                      {worstMonth.returnPercentage.toFixed(2)}%
                    </strong>
                    <span className={styles.monthValue}>
                      {formatCurrency(worstMonth.return)}
                    </span>
                  </div>
                ) : (
                  <p>Nenhum dado disponível</p>
                )}
              </div>

              <div className={styles.analysisCard}>
                <h5>📊 Volatilidade</h5>
                <div className={styles.volatilityInfo}>
                  <span>Variação Total</span>
                  <strong>
                    {formatCurrency(maxValue - minValue)}
                  </strong>
                  <span>Máximo: {formatCurrency(maxValue)}</span>
                  <span>Mínimo: {formatCurrency(minValue)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resumo Final */}
        <div className={styles.performanceSummary}>
          <div className={styles.summaryCard}>
            <h5>💰 Valor Atual Projetado</h5>
            <motion.span 
              className={styles.currentValue}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
            >
              {formatCurrency(currentValue)}
            </motion.span>
          </div>
          <div className={styles.summaryCard}>
            <h5>📈 Tendência</h5>
            <span 
              className={styles.trendIndicator}
              style={{ color: isPositiveTrend ? '#16a34a' : '#dc2626' }}
            >
              {isPositiveTrend ? '↗ Em Alta' : '↘ Em Baixa'}
            </span>
          </div>
          <div className={styles.summaryCard}>
            <h5>🎯 Performance</h5>
            <span 
              className={styles.performanceRating}
              style={{ 
                color: totalReturnPercentage >= 0 ? '#16a34a' : '#dc2626',
                background: totalReturnPercentage >= 0 ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)'
              }}
            >
              {totalReturnPercentage >= 0 ? '✅ ' : '❌ '}
              {totalReturnPercentage.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className={styles.disclaimer}>
          <AlertTriangle size={16} />
          <span>
            Os dados apresentados são simulados e têm fins demonstrativos. 
            Performance passada não garante resultados futuros.
          </span>
        </div>
      </div>
    </Modal>
  );
}

// --- MODAL DE ADICIONAR INVESTIMENTO ---
function InvestmentModal({ isOpen, onClose, onSave }: any) {
  const initialState = { name: '', type: investmentTypes[0].value, value: '', symbol: '' };

  const formReducer = (state: any, action: any) => {
    switch(action.type) {
      case 'SET_FIELD': return { ...state, [action.payload.field]: action.payload.value };
      case 'RESET': return initialState;
      default: return state;
    }
  };

  const [form, dispatch] = useReducer(formReducer, initialState);

  const handleSubmit = useCallback((e: React.FormEvent) => { 
    e.preventDefault();
    if (!form.name.trim() || !form.value) {
      toast.error('Preencha todos os campos!');
      return;
    }
    const value = parseFloat(form.value);
    if (isNaN(value) || value <= 0) {
      toast.error('Digite um valor válido!');
      return;
    }
    onSave({ ...form, value });
    dispatch({ type: 'RESET' });
  }, [form, onSave]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adicionar Investimento" size="medium">
      <form className={styles.modalForm} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label>Nome do Ativo</label>
          <input name="name" value={form.name} onChange={e => dispatch({ type: 'SET_FIELD', payload: { field: 'name', value: e.target.value }})} placeholder="Ex: PETR4" required />
        </div>
        <div className={styles.formGroup}>
          <label>Código do Ativo (para ações/ETF)</label>
          <input name="symbol" value={form.symbol} onChange={e => dispatch({ type: 'SET_FIELD', payload: { field: 'symbol', value: e.target.value }})} placeholder="Ex: PETR4.SA" />
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Valor Investido</label>
            <CustomNumberInput value={form.value} onChange={v => dispatch({ type: 'SET_FIELD', payload: { field: 'value', value: v }})} placeholder="1500.00" step={0.01} min={0.01} required />
          </div>
          <div className={styles.formGroup}>
            <label>Tipo</label>
            <CustomSelect options={investmentTypes} value={form.type} onChange={v => dispatch({ type: 'SET_FIELD', payload: { field: 'type', value: v }})} placeholder="Selecione o tipo" />
          </div>
        </div>
        <div className={styles.modalActions}>
          <motion.button type="button" onClick={onClose} className={styles.cancelButton} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Cancelar</motion.button>
          <motion.button type="submit" className={styles.saveButton} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Adicionar</motion.button>
        </div>
      </form>
    </Modal>
  );
}

// --- MODAL DE CONFIRMAÇÃO ---
function ConfirmDeleteInvestmentModal({ isOpen, onClose, onConfirm, investment }: any) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Exclusão" size="small">
      <div className={styles.confirmContent}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
          <AlertTriangle size={48} className={styles.confirmIcon} />
        </motion.div>
        <p>Tem certeza que deseja excluir o investimento<br /><strong>"{investment?.name}"</strong>?</p>
        <p className={styles.warningText}>Esta ação não pode ser desfeita.</p>
      </div>
      <div className={styles.modalActions}>
        <motion.button onClick={onClose} className={styles.cancelButton} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Cancelar</motion.button>
        <motion.button onClick={onConfirm} className={styles.deleteConfirmButton} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Sim, Excluir</motion.button>
      </div>
    </Modal>
  );
}