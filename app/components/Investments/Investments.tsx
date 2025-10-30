'use client';

// Imports de React (useState, useReducer, etc.)
import { useState, useReducer, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// Ícones
import { 
  Plus, 
  Trash2, 
  AlertTriangle, 
  TrendingUp,
  Landmark,
  LineChart,
  Building,
  Globe,
  Bitcoin,
  Package,
  Sparkles,
  Target,
  Wallet,
  TrendingDown,
  RefreshCw,
  // Ícones do Modal de Detalhes
  Calendar, 
  DollarSign, 
  ArrowUpRight,  
  ArrowDownLeft, 
  Activity, 
  ChevronsUp, 
  ChevronsDown,
  Edit3,
  PieChart
} from 'lucide-react';

import { getLast6Months } from "../../lib/getStockPrice";

// Estilos
import styles from './Investments.module.scss';

// Componentes
import CustomSelect from '../CustomSelect/CustomSelect';
import CustomNumberInput from '../CustomNumberInput/CustomNumberInput';
import Modal from '../Modal/Modal';
import { User } from 'firebase/auth';

// ===================================================================
// --- TIPOS E INTERFACES ---
// ===================================================================
export interface Investment {
  id: string;
  name: string;
  type: 'Renda Fixa' | 'Ações' | 'Fundo Imobiliário' | 'ETF' | 'Cripto' | 'Outro';
  value: number;
  symbol?: string;
  createdAt?: any;
  userId?: string;
}

interface MonthlyPerformance {
  month: string;
  value: number;
  return: number;
  returnPercentage: number;
}

interface InvestmentsProps {
  investments: Investment[];
  isLoading: boolean;
  user: User | null;
  onAddInvestment: (newInvestment: Omit<Investment, 'id'>) => Promise<void>;
  onEditInvestment: (investmentId: string, updatedData: Partial<Investment>) => Promise<void>;
  onDeleteInvestment: (id: string) => Promise<void>;
  onRefreshData: () => void;
  isRefreshing: boolean;
}

interface PortfolioStats {
  totalValue: number;
  totalInvested: number;
  totalReturn: number;
  returnPercentage: number;
  bestPerformer: Investment | null;
  worstPerformer: Investment | null;
}

interface PieChartData {
  type: Investment['type'];
  value: number;
  percentage: number;
  color: string;
  count: number;
}

const investmentTypes = [
  { value: 'Renda Fixa', label: 'Renda Fixa', icon: '📊' },
  { value: 'Ações', label: 'Ações', icon: '📈' },
  { value: 'Fundo Imobiliário', label: 'Fundo Imobiliário', icon: '🏢' },
  { value: 'ETF', label: 'ETF', icon: '🌍' },
  { value: 'Cripto', label: 'Cripto', icon: '🪙' },
  { value: 'Outro', label: 'Outro', icon: '💼' },
];

// ===================================================================
// --- FUNÇÕES UTILITÁRIAS ---
// ===================================================================
function formatCurrency(value: number) {
  if (typeof value !== 'number') return "R$ 0,00";
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercentage(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function generateMonthlyPerformance(investment: Investment): MonthlyPerformance[] {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
  let currentValue = investment.value;
  
  return months.map((month, index) => {
    const baseRates: Record<string, number> = {
      'Renda Fixa': 0.008,
      'Ações': 0.012,
      'Fundo Imobiliário': 0.009,
      'ETF': 0.011,
      'Cripto': 0.025,
      'Outro': 0.006
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

// ===================================================================
// --- COMPONENTES DE CARDS ---
// ===================================================================
function StatCard({ title, value, subtitle, icon, trend, color }: any) {
  return (
    <motion.div 
      className={styles.statCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.statCardHeader}>
        {icon}
        <span className={styles.statCardTitle}>{title}</span>
        {trend && (
          <div className={`${styles.trendIndicator} ${trend > 0 ? styles.positive : styles.negative}`}>
            {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div className={styles.statCardValue} style={{ color }}>
        {value}
      </div>
      {subtitle && <div className={styles.statCardSubtitle}>{subtitle}</div>}
    </motion.div>
  );
}

// ===================================================================
// --- COMPONENTES DE MODAL (Adicionar e Deletar) ---
// ===================================================================
function AddInvestmentModal({ isOpen, onClose, onAdd }: any) {
  const [name, setName] = useState('');
  const [type, setType] = useState(investmentTypes[0].value);
  const [value, setValue] = useState(0);
  const [symbol, setSymbol] = useState('');

  const handleTypeChange = (selectedValue: string) => {
    setType(selectedValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || value <= 0) {
      toast.error('Preencha o nome e um valor válido.');
      return;
    }
    
    const newInvestment: Omit<Investment, 'id'> = {
      name,
      type: type as Investment['type'],
      value: Number(value),
      symbol: symbol || undefined,
    };
    
    onAdd(newInvestment);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adicionar Investimento">
      <form onSubmit={handleSubmit} className={styles.modalForm}>
        <div className={styles.formGroup}>
          <label>Nome do Ativo</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Tesouro Selic 2029" 
            required
          />
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Tipo</label>
            <CustomSelect 
              options={investmentTypes}
              value={type}
              onChange={handleTypeChange} placeholder={''}            />
          </div>
          <div className={styles.formGroup}>
            <label>Símbolo (Opcional)</label>
            <input 
              type="text" 
              value={symbol} 
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="Ex: AAPL" 
            />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label>Valor Investido (R$)</label>
          <CustomNumberInput 
            value={value}
            onChange={(val: number) => setValue(val)}
          />
        </div>
        <div className={styles.modalActions}>
          <motion.button type="button" onClick={onClose} className={styles.cancelButton} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Cancelar</motion.button>
          <motion.button type="submit" className={styles.saveButton} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Adicionar</motion.button>
        </div>
      </form>
    </Modal>
  );
}

function ConfirmDeleteInvestmentModal({ isOpen, onClose, onConfirm, investment }: any) {
  const handleConfirm = () => {
    if (onConfirm && investment) {
      onConfirm(investment.id);
    }
    onClose();
  };
  
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
        <motion.button onClick={handleConfirm} className={styles.deleteConfirmButton} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Excluir</motion.button>
      </div>
    </Modal>
  );
}

// ===================================================================
// --- COMPONENTE PRINCIPAL ---
// ===================================================================
export default function Investments({ 
  investments,
  isLoading,
  user,
  onAddInvestment,
  onDeleteInvestment,
  onRefreshData,
  onEditInvestment,
  isRefreshing
}: InvestmentsProps) {
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [viewMode, setViewMode] = useState<'reports' | 'chart'>('reports');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

  const handleAddInvestment = async (newInvestment: Omit<Investment, 'id'>) => {
    try {
      await onAddInvestment(newInvestment);
      toast.success('Investimento adicionado!');
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Erro ao adicionar investimento:', error);
      toast.error('Erro ao adicionar investimento');
    }
  };

  const handleEditInvestment = async (id: string, updatedInvestment: Omit<Investment, 'id'>) => {
  try {
    // Convertemos Omit<Investment, 'id'> para Partial<Investment>
    const updatedData: Partial<Investment> = {
      name: updatedInvestment.name,
      type: updatedInvestment.type,
      value: updatedInvestment.value,
      symbol: updatedInvestment.symbol,
    };
    
    await onEditInvestment(id, updatedData);
    toast.success('Investimento atualizado!');
    setIsEditModalOpen(false);
    setEditingInvestment(null);
  } catch (error) {
    console.error('Erro ao editar investimento:', error);
    toast.error('Erro ao editar investimento');
  }
};

  const handleDeleteInvestment = async (id: string) => {
    try {
      await onDeleteInvestment(id);
      toast.success('Investimento excluído!');
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Erro ao excluir investimento:', error);
      toast.error('Erro ao excluir investimento');
    }
  };

  const openDeleteModal = (investment: Investment, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedInvestment(investment);
    setIsDeleteModalOpen(true);
  };
  
  const handleInvestmentClick = (investment: Investment) => {
    setSelectedInvestment(investment);
  };

  const openEditModal = (investment: Investment, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingInvestment(investment);
    setIsEditModalOpen(true);
  };

  // Componente de Performance em Tempo Real
  function RealTimePerformance({ symbol, currentValue }: { symbol: string, currentValue: number }) {
    const [performance, setPerformance] = useState<{ 
      change: number; 
      changePercent: number; 
      currentPrice: number;
      isRealData: boolean;
    } | null>(null);
    
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchPerformanceData = async () => {
        try {
          setLoading(true);
          const monthlyData = await getLast6Months(symbol);
          
          if (monthlyData.length >= 2) {
            const firstMonth = monthlyData[0];
            const lastMonth = monthlyData[monthlyData.length - 1];
            
            const change = lastMonth.value - firstMonth.value;
            const changePercent = (change / firstMonth.value) * 100;

            setPerformance({
              change: Number(change.toFixed(2)),
              changePercent: Number(changePercent.toFixed(2)),
              currentPrice: lastMonth.value,
              isRealData: true
            });
          } else {
            const conservativeChange = (Math.random() * 0.1 - 0.02) * currentValue;
            const conservativeChangePercent = (conservativeChange / currentValue) * 100;
            
            setPerformance({
              change: Number(conservativeChange.toFixed(2)),
              changePercent: Number(conservativeChangePercent.toFixed(2)),
              currentPrice: currentValue + conservativeChange,
              isRealData: false
            });
          }
        } catch (error) {
          console.error('Erro ao calcular performance:', error);
          const fallbackChange = (Math.random() * 0.08 - 0.02) * currentValue;
          const fallbackChangePercent = (fallbackChange / currentValue) * 100;
          
          setPerformance({
            change: Number(fallbackChange.toFixed(2)),
            changePercent: Number(fallbackChangePercent.toFixed(2)),
            currentPrice: currentValue + fallbackChange,
            isRealData: false
          });
        } finally {
          setLoading(false);
        }
      };

      fetchPerformanceData();
      const interval = setInterval(fetchPerformanceData, 300000);
      return () => clearInterval(interval);
    }, [symbol, currentValue]);

    if (loading) {
      return (
        <div className={styles.performanceBadge}>
          <RefreshCw size={12} className={styles.refreshing} />
          <span>Carregando...</span>
        </div>
      );
    }

    if (!performance) {
      return (
        <div className={styles.performanceBadge}>
          <AlertTriangle size={12} />
          <span>Sem dados</span>
        </div>
      );
    }

    const isPositive = performance.change >= 0;

    return (
      <div className={styles.realTimePerformance}>
        <div 
          className={`${styles.performanceBadge} ${isPositive ? styles.positive : styles.negative} ${
            !performance.isRealData ? styles.simulated : ''
          }`}
          title={performance.isRealData ? "Dados reais" : "Dados simulados"}
        >
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{performance.changePercent.toFixed(2)}%</span>
          {!performance.isRealData && <span className={styles.simulatedIndicator}>*</span>}
        </div>

        {performance.isRealData && (
          <div className={styles.currentPrice}>
            <small>Cota: {formatCurrency(performance.currentPrice)}</small>
          </div>
        )}
      </div>
    );
  }

  // Cálculos do portfólio
  const portfolioStats = useMemo((): PortfolioStats => {
    const totalValue = investments.reduce((sum, inv) => sum + inv.value, 0);
    const totalInvested = investments.reduce((sum, inv) => sum + inv.value, 0);
    const totalReturn = 0; 
    const returnPercentage = 0;

    const bestPerformer = investments.length > 0 ? 
      investments.reduce((best, current) => current.value > best.value ? current : best, investments[0]) : null;
    
    const worstPerformer = investments.length > 0 ? 
      investments.reduce((worst, current) => current.value < worst.value ? current : worst, investments[0]) : null;

    return {
      totalValue,
      totalInvested,
      totalReturn,
      returnPercentage,
      bestPerformer,
      worstPerformer
    };
  }, [investments]);

  // Função para obter cores dos tipos
  const getTypeColor = (type: Investment['type']) => {
    switch (type) {
      case 'Renda Fixa': return '#34d399';
      case 'Ações': return '#60a5fa';
      case 'Fundo Imobiliário': return '#fbbf24';
      case 'ETF': return '#a78bfa';
      case 'Cripto': return '#f87171';
      default: return '#6b7280';
    }
  };

  function EditInvestmentModal({ isOpen, onClose, onEdit, investment }: any) {
  const [name, setName] = useState(investment?.name || '');
  const [type, setType] = useState(investment?.type || investmentTypes[0].value);
  const [value, setValue] = useState(investment?.value || 0);
  const [symbol, setSymbol] = useState(investment?.symbol || '');

  useEffect(() => {
    if (investment) {
      setName(investment.name);
      setType(investment.type);
      setValue(investment.value);
      setSymbol(investment.symbol || '');
    }
  }, [investment]);

  const handleTypeChange = (selectedValue: string) => {
    setType(selectedValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || value <= 0) {
      toast.error('Preencha o nome e um valor válido.');
      return;
    }
    
    const updatedInvestment: Omit<Investment, 'id'> = {
      name,
      type: type as Investment['type'],
      value: Number(value),
      symbol: symbol || undefined,
    };
    
    onEdit(investment.id, updatedInvestment);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Investimento">
      <form onSubmit={handleSubmit} className={styles.modalForm}>
        {/* Mesmo conteúdo do modal de adicionar, mas com valores pré-preenchidos */}
        <div className={styles.formGroup}>
          <label>Nome do Ativo</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Tesouro Selic 2029" 
            required
          />
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Tipo</label>
            <CustomSelect 
              options={investmentTypes} 
              value={type}
              onChange={handleTypeChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Símbolo (Opcional)</label>
            <input 
              type="text" 
              value={symbol} 
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="Ex: AAPL" 
            />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label>Valor Investido (R$)</label>
          <CustomNumberInput 
            value={value}
            onChange={(val: number) => setValue(val)}
          />
        </div>
        <div className={styles.modalActions}>
          <motion.button type="button" onClick={onClose} className={styles.cancelButton} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Cancelar</motion.button>
          <motion.button type="submit" className={styles.saveButton} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Salvar Alterações</motion.button>
        </div>
      </form>
    </Modal>
  );
}

// ===================================================================
// --- COMPONENTE DO GRÁFICO DE DONUT CORRIGIDO ---
// ===================================================================
const PortfolioDonutChart = ({ investments }: { investments: Investment[] }) => {
  // Estado de interação
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ left: number; top: number; title: string; value: string; percent: string } | null>(null);

  // Portfolio stats
  const portfolioStats = useMemo((): PortfolioStats => {
    const totalValue = investments.reduce((sum, inv) => sum + inv.value, 0);
    const totalInvested = totalValue;
    const totalReturn = 0;
    const returnPercentage = 0;
    const bestPerformer = investments.length > 0 ? investments.reduce((best, current) => current.value > best.value ? current : best, investments[0]) : null;
    const worstPerformer = investments.length > 0 ? investments.reduce((worst, current) => current.value < worst.value ? current : worst, investments[0]) : null;
    return { totalValue, totalInvested, totalReturn, returnPercentage, bestPerformer, worstPerformer };
  }, [investments]);

  // Dados agregados por tipo
  const donutData = useMemo(() => {
    const typeTotals: Record<string, { value: number; count: number }> = {};
    investments.forEach(inv => {
      const t = inv.type;
      if (!typeTotals[t]) typeTotals[t] = { value: 0, count: 0 };
      typeTotals[t].value += inv.value;
      typeTotals[t].count += 1;
    });

    const typeColors: Record<string, string> = {
      'Renda Fixa': '#10b981',
      'Ações': '#3b82f6',
      'Fundo Imobiliário': '#f59e0b',
      'ETF': '#8b5cf6',
      'Cripto': '#ef4444',
      'Outro': '#6b7280'
    };

    const typeGradients: Record<string, [string, string]> = {
      'Renda Fixa': ['#0ea5a4', '#34d399'],
      'Ações': ['#2563eb', '#60a5fa'],
      'Fundo Imobiliário': ['#d97706', '#fbbf24'],
      'ETF': ['#7c3aed', '#a78bfa'],
      'Cripto': ['#dc2626', '#f87171'],
      'Outro': ['#374151', '#9ca3af']
    };

    const total = Object.values(typeTotals).reduce((s, v) => s + v.value, 0) || 1;

    return Object.entries(typeTotals).map(([type, data]) => ({
      type,
      value: data.value,
      percentage: (data.value / total) * 100,
      color: typeColors[type] || '#6b7280',
      gradient: typeGradients[type] || ['#6b7280', '#9ca3af'],
      count: data.count,
      icon: getInvestmentIcon(type as Investment['type'])
    })).sort((a, b) => b.value - a.value);
  }, [investments]);

  // Cálculo de ângulos e paths
  const DONUT_SIZE = 240;
  const CX = DONUT_SIZE / 2;
  const CY = DONUT_SIZE / 2;
  const OUTER = 86;
  const INNER = 52;

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const a = (angle - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  const describeArc = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(CX, CY, OUTER, endAngle);
    const end = polarToCartesian(CX, CY, OUTER, startAngle);
    const startInner = polarToCartesian(CX, CY, INNER, endAngle);
    const endInner = polarToCartesian(CX, CY, INNER, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${OUTER} ${OUTER} 0 ${largeArc} 0 ${end.x} ${end.y} L ${endInner.x} ${endInner.y} A ${INNER} ${INNER} 0 ${largeArc} 1 ${startInner.x} ${startInner.y} Z`;
  };

  // Build slices with angles
  let angleCursor = 0;
  const slices = donutData.map(d => {
    const sliceAngle = (d.percentage / 100) * 360;
    const slice = {
      ...d,
      startAngle: angleCursor,
      endAngle: angleCursor + sliceAngle,
      midAngle: angleCursor + sliceAngle / 2
    };
    angleCursor += sliceAngle;
    return slice;
  });

  const handleMouseMove = (e: React.MouseEvent, sliceType: string | null, slice?: any) => {
    const rect = (e.target as Element).closest('svg')?.getBoundingClientRect();
    const left = rect ? e.clientX - rect.left : 0;
    const top = rect ? e.clientY - rect.top : 0;
    if (sliceType && slice) {
      setTooltip({
        left,
        top,
        title: slice.type,
        value: formatCurrency(slice.value),
        percent: `${slice.percentage.toFixed(1)}%`
      });
    } else {
      setTooltip(null);
    }
  };

  // Center display: mostra total (padrão) e dados da fatia no hover/seleção
  const centerTitle = selectedSlice ? selectedSlice : (hoveredSlice ? hoveredSlice : 'Total Investido');
  const centerValue = (() => {
    const slice = slices.find(s => s.type === (selectedSlice || hoveredSlice));
    if (slice) return `${formatCurrency(slice.value)} • ${slice.percentage.toFixed(1)}%`;
    return formatCurrency(portfolioStats.totalValue);
  })();

  // Transform para "explodir" a fatia ao hover
  const getTransformForMidAngle = (midAngle: number, dist = 8) => {
    const r = (midAngle - 90) * Math.PI / 180;
    return `translate(${Math.cos(r) * dist}px, ${Math.sin(r) * dist}px)`;
  };

  return (
    <div className={styles.donutChartCard}>
      <div className={styles.donutChartHeader}>
        <div className={styles.headerMain}>
          <h3>Distribuição da Carteira</h3>
          <div className={styles.headerStats}>
            <span className={styles.statPill}>{investments.length} {investments.length === 1 ? 'ativo' : 'ativos'}</span>
            <span className={styles.statPill}>{formatCurrency(portfolioStats.totalValue)}</span>
          </div>
        </div>
        <PieChart size={20} className={styles.chartIcon} />
      </div>

      <div className={styles.donutChartContainer}>
        <div className={styles.donutChartSvg}>
          <svg width={DONUT_SIZE} height={DONUT_SIZE} viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`} className={styles.donutSvg}>
            <defs>
              {slices.map((s, i) => (
                <linearGradient id={`g-${i}`} key={s.type} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={s.gradient ? s.gradient[0] : s.color} />
                  <stop offset="100%" stopColor={s.gradient ? s.gradient[1] : s.color} />
                </linearGradient>
              ))}
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* circle shadow background */}
            <circle cx={CX} cy={CY} r={OUTER + 6} fill="rgba(0,0,0,0.18)" />

            {/* base ring (subtle) */}
            <circle cx={CX} cy={CY} r={OUTER} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="6" />

            {/* slices */}
            {slices.map((slice, idx) => {
              const path = describeArc(slice.startAngle, slice.endAngle);
              const isHovered = hoveredSlice === slice.type;
              const isSelected = selectedSlice === slice.type;
              const transform = isHovered || isSelected ? getTransformForMidAngle(slice.midAngle, 10) : 'translate(0,0)';
              return (
                <motion.path
                  key={slice.type}
                  d={path}
                  fill={`url(#g-${idx})`}
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth={1}
                  className={styles.donutSlice}
                  style={{
                    transform,
                    transformOrigin: `${CX}px ${CY}px`,
                    cursor: 'pointer',
                    opacity: selectedSlice && !isSelected ? 0.45 : 1
                  }}
                  whileHover={{ scale: 1.02 }}
                  initial={{ opacity: 0, pathLength: 0 }}
                  animate={{ opacity: 1, pathLength: 1 }}
                  transition={{ duration: 0.6, delay: idx * 0.06, type: 'spring', stiffness: 90 }}
                  onMouseEnter={(e) => { setHoveredSlice(slice.type); handleMouseMove(e, slice.type, slice); }}
                  onMouseMove={(e) => handleMouseMove(e, slice.type, slice)}
                  onMouseLeave={() => { setHoveredSlice(null); setTooltip(null); }}
                  onClick={() => setSelectedSlice(selectedSlice === slice.type ? null : slice.type)}
                  filter={isHovered ? "url(#glow)" : undefined}
                />
              );
            })}

            {/* donut center - ring to create inner hole */}
            <circle cx={CX} cy={CY} r={INNER} fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />

            {/* centro texto */}
            <g className={styles.donutCenterGroup}>
              <text x={CX} y={CY - 6} textAnchor="middle" className={styles.donutCenterLabel} style={{ fill: 'var(--text-muted)' }}>{centerTitle}</text>
              <text x={CX} y={CY + 16} textAnchor="middle" className={styles.donutCenterValue} style={{ fill: 'var(--text)' }}>{centerValue}</text>
            </g>
          </svg>

          {/* tooltip flutuante */}
          {tooltip && (
            <div
              className={styles.donutTooltip}
              style={{ left: tooltip.left + 12, top: tooltip.top - 12 }}
            >
              <div className={styles.tooltipTitle}>{tooltip.title}</div>
              <div className={styles.tooltipValue}>{tooltip.value}</div>
              <div className={styles.tooltipPercent}>{tooltip.percent}</div>
            </div>
          )}
        </div>

        {/* legenda */}
        <div className={styles.donutLegend}>
          <div className={styles.legendHeader}>
            <h4>Tipos de Investimento</h4>
            <div className={styles.legendStats}>
              <span>{slices.length} categorias</span>
            </div>
          </div>

          <div className={styles.legendList}>
            {slices.map((s) => {
              const isActive = hoveredSlice === s.type || selectedSlice === s.type;
              return (
                <motion.div
                  key={s.type}
                  className={`${styles.legendItem} ${isActive ? styles.legendItemActive : ''}`}
                  onMouseEnter={() => setHoveredSlice(s.type)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  onClick={() => setSelectedSlice(selectedSlice === s.type ? null : s.type)}
                  whileHover={{ x: 6 }}
                >
                  <div className={styles.legendColor} style={{ background: `linear-gradient(90deg, ${s.gradient?.[0] || s.color}, ${s.gradient?.[1] || s.color})`}} />
                  <div className={styles.legendMain}>
                    <div className={styles.legendTitle}>
                      <span className={styles.legendType}>{s.type}</span>
                      <span className={styles.legendPct}>{s.percentage.toFixed(1)}%</span>
                    </div>
                    <div className={styles.legendMeta}>
                      <span className={styles.legendCount}>{s.count} {s.count === 1 ? 'ativo' : 'ativos'}</span>
                      <strong className={styles.legendValue}>{formatCurrency(s.value)}</strong>
                    </div>

                    <div className={styles.legendBar}>
                      <motion.div className={styles.legendBarFill} style={{ background: s.color }} initial={{ width: 0 }} animate={{ width: `${s.percentage}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* resumo */}
      <div className={styles.donutSummary}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}><Target size={18} /></div>
          <div className={styles.summaryContent}>
            <span>Maior Categoria</span>
            <strong>{donutData[0]?.type || 'N/A'}</strong>
            <small>{donutData[0]?.percentage ? `${donutData[0].percentage.toFixed(1)}%` : '—'}</small>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}><TrendingUp size={18} /></div>
          <div className={styles.summaryContent}>
            <span>Diversificação</span>
            <strong>{donutData.length} categorias</strong>
            <small>Mais equilíbrio = menor risco</small>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}><Package size={18} /></div>
          <div className={styles.summaryContent}>
            <span>Menor Categoria</span>
            <strong>{donutData[donutData.length - 1]?.type || 'N/A'}</strong>
            <small>{donutData[donutData.length - 1]?.percentage ? `${donutData[donutData.length - 1].percentage.toFixed(1)}%` : '—'}</small>
          </div>
        </div>
      </div>
    </div>
  );
};

  // Funções de UI
  const getInvestmentIcon = (type: Investment['type']) => {
    switch (type) {
      case 'Renda Fixa': return <Landmark size={20} />;
      case 'Ações': return <LineChart size={20} />;
      case 'Fundo Imobiliário': return <Building size={20} />;
      case 'ETF': return <Globe size={20} />;
      case 'Cripto': return <Bitcoin size={20} />;
      default: return <Package size={20} />;
    }
  };

  return (
    <>
      <div className={styles.container}>
        {/* Header com Toggle */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <Sparkles size={24} className={styles.headerIcon} />
            </motion.div>
            <div>
              <h2>Meus Investimentos</h2>
              <p className={styles.headerSubtitle}>
                {investments.length} ativo{investments.length !== 1 ? 's' : ''} acompanhado{investments.length !== 1 ? 's' : ''}
                {!user && ' - Modo local'}
              </p>
            </div>
          </div>
          
          <div className={styles.headerActions}>
            {/* Toggle para alternar entre relatórios e gráfico */}
            <div className={styles.viewToggle}>
              <button 
                className={`${styles.toggleButton} ${viewMode === 'reports' ? styles.activeToggle : ''}`}
                onClick={() => setViewMode('reports')}
              >
                <Wallet size={16} />
                <span>Relatórios</span>
              </button>
              <button 
                className={`${styles.toggleButton} ${viewMode === 'chart' ? styles.activeToggle : ''}`}
                onClick={() => setViewMode('chart')}
              >
                <PieChart size={16} />
                <span>Distribuição</span>
              </button>
            </div>

            <motion.button 
              className={styles.refreshButton}
              onClick={onRefreshData}
              disabled={isRefreshing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw size={18} className={isRefreshing ? styles.refreshing : ''} />
            </motion.button>
            
            <motion.button 
              className={styles.addButton} 
              onClick={() => setIsAddModalOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus size={20} />
              <span>Novo Investimento</span>
            </motion.button>
          </div>
        </div>

        {/* Renderização condicional baseada no viewMode */}
        {viewMode === 'reports' ? (
          <>
            {/* Cartões de Estatísticas (modo relatórios) */}
            <div className={styles.statsGrid}>
              <StatCard
                title="Valor Total"
                value={formatCurrency(portfolioStats.totalValue)}
                subtitle="Patrimônio atual"
                icon={<Wallet size={20} />}
                color="var(--accent)"
              />
              
              <StatCard
                title="Total Investido"
                value={formatCurrency(portfolioStats.totalInvested)}
                subtitle="Valor aplicado"
                icon={<TrendingUp size={20} />}
                color="#3b82f6"
              />
              
              <StatCard
                title="Melhor Performance"
                value={portfolioStats.bestPerformer ? portfolioStats.bestPerformer.name : 'N/A'}
                subtitle={portfolioStats.bestPerformer ? formatCurrency(portfolioStats.bestPerformer.value) : ''}
                icon={<Target size={20} />}
                color={portfolioStats.bestPerformer ? getTypeColor(portfolioStats.bestPerformer.type) : 'var(--muted)'}
              />
            </div>
          </>
        ) : (
          <>
            {/* Gráfico de Pizza (modo distribuição) */}
            <PortfolioDonutChart investments={investments} />
          </>
        )}

        {/* Lista de Investimentos (sempre visível) */}
        <div className={styles.investmentList}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className={styles.loadingSpinner}
              />
              <p>Carregando seus investimentos...</p>
            </div>
          ) : investments.length === 0 ? (
            <motion.div 
              className={styles.emptyState}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Package size={64} className={styles.emptyIcon} />
              <h3>Nenhum investimento encontrado</h3>
              <p>Comece adicionando seu primeiro ativo à carteira</p>
              <motion.button 
                className={styles.addButton}
                onClick={() => setIsAddModalOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus size={18} />
                Adicionar Primeiro Investimento
              </motion.button>
            </motion.div>
          ) : (
            <AnimatePresence>
              {investments.map((investment, index) => (
                <motion.div
                  key={investment.id}
                  className={styles.investmentItem}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, zIndex: 1 }}
                  onClick={() => handleInvestmentClick(investment)}
                >
                  <div 
                    className={styles.iconWrapper} 
                    style={{ 
                      background: `linear-gradient(135deg, ${getTypeColor(investment.type)}20, ${getTypeColor(investment.type)}10)`,
                      color: getTypeColor(investment.type)
                    }}
                  >
                    {getInvestmentIcon(investment.type)}
                  </div>
                  
                  <div className={styles.itemInfo}>
                    <h4>{investment.name}</h4>
                    <div className={styles.itemMeta}>
                      <span className={styles.typeBadge}>{investment.type}</span>
                      {investment.symbol && (
                        <span className={styles.symbolBadge}>{investment.symbol}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.itemValue}>
                    <div className={styles.valueData}>
                      <strong className={styles.value}>
                        {formatCurrency(investment.value)}
                      </strong>
                      {user && investment.symbol && (
                        <RealTimePerformance 
                          symbol={investment.symbol}
                          currentValue={investment.value}
                        />
                      )}
                    </div>
                    
                    <div className={styles.actions}>
                      <motion.button 
                        className={styles.editButton} 
                        onClick={(e) => openEditModal(investment, e)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Edit3 size={16} />
                      </motion.button>
                      
                      <motion.button 
                        className={styles.deleteButton} 
                        onClick={(e) => openDeleteModal(investment, e)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Trash2 size={16} />
                    </motion.button>
                  </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Modais */}
      <AddInvestmentModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddInvestment}
      />

      <ConfirmDeleteInvestmentModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteInvestment}
        investment={selectedInvestment}
      />
      
      <InvestmentDetailsModal 
        isOpen={!!selectedInvestment && !isDeleteModalOpen}
        onClose={() => setSelectedInvestment(null)} 
        investment={selectedInvestment} 
        formatCurrency={formatCurrency}
      />

      <EditInvestmentModal 
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingInvestment(null);
        }}
        onEdit={handleEditInvestment}
        investment={editingInvestment}
      />
    </>
  );
}

// ===================================================================
// --- MODAL DE DETALHES DO INVESTIMENTO ---
// ===================================================================
function InvestmentDetailsModal({ isOpen, onClose, investment, formatCurrency }: any) {
  const [performanceData, setPerformanceData] = useState<MonthlyPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'chart' | 'table' | 'analysis'>('chart');
  const [chartType, setChartType] = useState<'line' | 'area'>('line');

  // Constantes do Gráfico
  const SVG_VIEWBOX_WIDTH = 200;
  const SVG_VIEWBOX_HEIGHT = 100;
  const SVG_PADDING = 10; 
  const GRAPH_WIDTH = SVG_VIEWBOX_WIDTH - (SVG_PADDING * 2);
  const GRAPH_START_X = SVG_PADDING;
  const GRAPH_END_X = SVG_VIEWBOX_WIDTH - SVG_PADDING;
  
  useEffect(() => {
    if (!investment) return;

    setIsLoading(true);

    if (investment.symbol) {
      getLast6Months(investment.symbol)
        .then((data) => {
          if (data && data.length > 0) {
            setPerformanceData(data.map((d) => ({
              month: d.month,
              value: d.value,
              return: 0,
              returnPercentage: 0,
            })));
          } else {
            setPerformanceData(generateMonthlyPerformance(investment));
          }
        })
        .catch((err) => {
          console.warn("Erro ao buscar dados reais:", err);
          setPerformanceData(generateMonthlyPerformance(investment));
        })
        .finally(() => setIsLoading(false));
    } else {
      const simulated = generateMonthlyPerformance(investment);
      setPerformanceData(simulated);
      setIsLoading(false);
    }
  }, [investment]);

  // Cálculos de métricas
  const totalReturn = performanceData.length > 0 ? performanceData.reduce((sum, month) => sum + month.return, 0) : 0;
  const totalReturnPercentage = investment && performanceData.length > 0 ? (totalReturn / investment.value) * 100 : 0;
  const averageMonthlyReturn = performanceData.length > 0 ? performanceData.reduce((sum, month) => sum + month.returnPercentage, 0) / performanceData.length : 0;
  const maxValue = performanceData.length > 0 ? Math.max(...performanceData.map(d => d.value)) : (investment?.value || 0);
  const minValue = performanceData.length > 0 ? Math.min(...performanceData.map(d => d.value)) : (investment?.value || 0);
  const currentValue = performanceData.length > 0 ? performanceData[performanceData.length - 1].value : (investment?.value || 0);
  const isPositiveTrend = performanceData.length > 1 ? performanceData[performanceData.length - 1].value > performanceData[0].value : true;
  const bestMonth = performanceData.length > 0 ? performanceData.reduce((best, current) => current.returnPercentage > best.returnPercentage ? current : best, performanceData[0]) : null;
  const worstMonth = performanceData.length > 0 ? performanceData.reduce((worst, current) => current.returnPercentage < worst.returnPercentage ? current : worst, performanceData[0]) : null;

  // Funções de cálculo do gráfico
  const calculateSmoothLinePoints = useCallback(() => {
    if (performanceData.length === 0) return '';
    const points = performanceData.map((month, index) => {
      const x = ((index / (performanceData.length - 1)) * GRAPH_WIDTH) + GRAPH_START_X;
      const y = 100 - (((month.value - minValue) / (maxValue - minValue || 1)) * 90 + 5);
      return { x, y };
    });
    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const current = points[i];
      const controlPoint1 = { x: prev.x + (current.x - prev.x) * 0.3, y: prev.y };
      const controlPoint2 = { x: prev.x + (current.x - prev.x) * 0.7, y: current.y };
      path += ` C ${controlPoint1.x},${controlPoint1.y} ${controlPoint2.x},${controlPoint2.y} ${current.x},${current.y}`;
    }
    return path;
  }, [performanceData, minValue, maxValue, GRAPH_WIDTH, GRAPH_START_X]);

  const calculateAreaPath = useCallback(() => {
    const linePath = calculateSmoothLinePoints();
    if (!linePath) return '';
    return `${linePath} L ${GRAPH_END_X},${SVG_VIEWBOX_HEIGHT} L ${GRAPH_START_X},${SVG_VIEWBOX_HEIGHT} Z`;
  }, [calculateSmoothLinePoints, GRAPH_START_X, GRAPH_END_X, SVG_VIEWBOX_HEIGHT]);

  const calculateLinePoints = useCallback(() => {
    if (performanceData.length === 0) return '';
    const points = performanceData.map((month, index) => {
      const x = ((index / (performanceData.length - 1)) * GRAPH_WIDTH) + GRAPH_START_X;
      const y = 100 - (((month.value - minValue) / (maxValue - minValue || 1)) * 90 + 5);
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  }, [performanceData, minValue, maxValue, GRAPH_WIDTH, GRAPH_START_X]);

  const gridLines = useMemo(() => {
    if (performanceData.length === 0 || maxValue === minValue) return [];
    const lines = [];
    const valueRange = maxValue - minValue;
    for (let i = 0; i <= 4; i++) {
      const value = minValue + (valueRange * i) / 4;
      const y = 100 - (((value - minValue) / valueRange) * 90 + 5);
      lines.push({ value, y, label: formatCurrency(value) });
    }
    return lines;
  }, [performanceData, minValue, maxValue, formatCurrency]);

  const positiveMonths = performanceData.filter(month => month.returnPercentage >= 0).length;
  const negativeMonths = performanceData.filter(month => month.returnPercentage < 0).length;
  const successRate = performanceData.length > 0 ? (positiveMonths / performanceData.length) * 100 : 0;

  if (!investment) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Detalhes - ${investment.name}`} size="large">
      <div className={styles.detailsContent}>
        <div className={styles.detailsHeader}>
          <div className={styles.investmentType}>
            <span className={styles.typeBadge}>{investment.type}</span>
            {investment.symbol && <span className={styles.symbolBadge}>{investment.symbol}</span>}
          </div>
          <div className={styles.investmentStats}>
            <div className={styles.stat}><DollarSign size={16} /><span>Valor Investido</span><strong>{formatCurrency(investment.value)}</strong></div>
            <div className={styles.stat}><TrendingUp size={16} /><span>Retorno Total</span><strong style={{ color: totalReturn >= 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(totalReturn)} ({totalReturnPercentage.toFixed(2)}%)</strong></div>
            <div className={styles.stat}><Calendar size={16} /><span>Retorno Médio</span><strong style={{ color: averageMonthlyReturn >= 0 ? '#16a34a' : '#dc2626' }}>{averageMonthlyReturn.toFixed(2)}%</strong></div>
          </div>
        </div>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab === 'chart' ? styles.activeTab : ''}`} onClick={() => setActiveTab('chart')}>📊 Gráfico</button>
          <button className={`${styles.tab} ${activeTab === 'table' ? styles.activeTab : ''}`} onClick={() => setActiveTab('table')}>📋 Tabela</button>
          <button className={`${styles.tab} ${activeTab === 'analysis' ? styles.activeTab : ''}`} onClick={() => setActiveTab('analysis')}>🔍 Análise</button>
        </div>

        {activeTab === 'chart' && (
          <div className={styles.performanceChart}>
            <div className={styles.chartHeader}>
              <h4>Evolução dos Últimos 6 Meses</h4>
              <div className={styles.chartControls}>
                <button className={`${styles.chartTypeButton} ${chartType === 'line' ? styles.activeChartType : ''}`} onClick={() => setChartType('line')}>📈 Linha</button>
                <button className={`${styles.chartTypeButton} ${chartType === 'area' ? styles.activeChartType : ''}`} onClick={() => setChartType('area')}>🗂 Área</button>
              </div>
            </div>
            
            <div className={styles.lineChartContainer}>
              {isLoading ? (
                <div className={styles.loadingState}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className={styles.loadingSpinner} />
                  <p>Carregando dados de performance...</p>
                </div>
              ) : performanceData.length > 0 ? (
                <div className={styles.lineChart}>
                  <div className={styles.yAxis}>
                    {gridLines.map((line, index) => (
                      <div 
                        key={index} 
                        className={styles.yTick} 
                        style={{ 
                          // CORREÇÃO: Posiciona de cima para baixo (valores maiores em cima)
                          top: `${line.y}%`,
                          transform: 'translateY(-50%)' // Centraliza verticalmente
                        }}
                      >
                        <span className={styles.yLabel}>{line.label}</span>
                        <div className={styles.gridLine} />
                      </div>
                    ))}
                  </div>
                  
                  <div className={styles.chartSvgContainer}>
                    <svg 
                      viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${SVG_VIEWBOX_HEIGHT}`} 
                      preserveAspectRatio="none"
                      className={styles.lineSvg}
                    >
                      <defs>
                        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={isPositiveTrend ? '#16a34a40' : '#dc262640'} /><stop offset="100%" stopColor={isPositiveTrend ? '#16a34a05' : '#dc262605'} /></linearGradient>
                        <linearGradient id="lineStroke" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={isPositiveTrend ? '#16a34a' : '#dc2626'} /><stop offset="50%" stopColor={isPositiveTrend ? '#22c55e' : '#ef4444'} /><stop offset="100%" stopColor={isPositiveTrend ? '#4ade80' : '#f87171'} /></linearGradient>
                        <pattern id="gridPattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--glass-border)" strokeWidth="0.5"/></pattern>
                      </defs>
                      
                      <rect width={SVG_VIEWBOX_WIDTH} height={SVG_VIEWBOX_HEIGHT} fill="url(#gridPattern)" opacity="0.3" />
                      
                      {gridLines.map((line, index) => (
                        <line
                          key={`grid-${index}`} x1="0" y1={line.y}
                          x2={SVG_VIEWBOX_WIDTH} y2={line.y}
                          stroke="var(--glass-border)" strokeWidth="0.3" strokeDasharray="1,2"
                        />
                      ))}
                      
                      {chartType === 'area' && (
                        <motion.path d={calculateAreaPath()} fill="url(#areaGradient)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, ease: "easeOut" }} />
                      )}
                      
                      <motion.path
                        d={chartType === 'area' ? calculateSmoothLinePoints() : calculateLinePoints()}
                        fill="none" stroke="url(#lineStroke)" strokeWidth={chartType === 'area' ? "2" : "3"}
                        strokeLinecap="round" strokeLinejoin="round"
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: "easeInOut" }}
                      />
                      
                      {performanceData.map((month, index) => {
                        const x = ((index / (performanceData.length - 1)) * GRAPH_WIDTH) + GRAPH_START_X;
                        const y = 100 - (((month.value - minValue) / (maxValue - minValue || 1)) * 90 + 5);
                        return (
                          <g key={month.month}>
                            <motion.circle
                              cx={x} cy={y} r="8" fill={isPositiveTrend ? '#16a34a' : '#dc2626'}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: hoveredPoint === index ? 1.2 : 0, opacity: hoveredPoint === index ? 0.2 : 0 }}
                              transition={{ duration: 0.2 }}
                            />
                            <motion.circle
                              cx={x} cy={y} r="4" fill={isPositiveTrend ? '#16a34a' : '#dc2626'}
                              stroke="#fff" strokeWidth="2"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: index * 0.1 + 0.5, duration: 0.3, type: "spring", stiffness: 200 }}
                              onMouseEnter={() => setHoveredPoint(index)} onMouseLeave={() => setHoveredPoint(null)}
                              className={styles.dataPoint}
                              whileHover={{ scale: 1.3, strokeWidth: "3" }}
                            />
                          </g>
                        );
                      })}
                      
                      {performanceData.length > 1 && (
                        <motion.line
                          x1={GRAPH_START_X}
                          y1={100 - (((performanceData[0].value - minValue) / (maxValue - minValue || 1)) * 90 + 5)}
                          x2={GRAPH_END_X}
                          y2={100 - (((performanceData[performanceData.length - 1].value - minValue) / (maxValue - minValue || 1)) * 90 + 5)}
                          stroke={isPositiveTrend ? '#16a34a' : '#dc2626'}
                          strokeWidth="0.5" strokeDasharray="3,2"
                          initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 1.5, duration: 0.5 }}
                        />
                      )}
                    </svg>
                    
                    {hoveredPoint !== null && performanceData[hoveredPoint] && (
                      (() => {
                        const month = performanceData[hoveredPoint];
                        const yPercent = 90 - (((month.value - minValue) / (maxValue - minValue || 1)) * 90 + 5);
                        const xPercent = ((hoveredPoint / (performanceData.length - 1)) * (GRAPH_WIDTH / SVG_VIEWBOX_WIDTH) * 100) + (GRAPH_START_X / SVG_VIEWBOX_WIDTH * 100);

                        return (
                          <motion.div 
                            className={styles.lineTooltip}
                            style={{
                              left: `${xPercent}%`,
                              top: `${yPercent}%`,
                              x: "-50%",
                            }}
                            initial={{ opacity: 0, y: "20px", scale: 0.8 }}
                            animate={{ 
                              opacity: 1, 
                              y: "calc(-100% - 10px)",
                              scale: 1 
                            }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          >
                            <div className={styles.tooltipArrow} />
                            <div className={styles.tooltipContent}>
                              <div className={styles.tooltipHeader}>
                                <strong>{performanceData[hoveredPoint].month}</strong>
                                <span 
                                  className={styles.tooltipReturn}
                                  style={{ color: performanceData[hoveredPoint].return >= 0 ? '#16a34a' : '#dc2626' }}
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
                                  <strong style={{ color: performanceData[hoveredPoint].return >= 0 ? '#16a34a' : '#dc2626' }}>
                                    {performanceData[hoveredPoint].return >= 0 ? '+' : ''}
                                    {formatCurrency(performanceData[hoveredPoint].return)}
                                  </strong>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })()
                    )}

                  </div>
                  
                  <div className={styles.xAxis}>
                    {performanceData.map((month, index) => {
                        const numPoints = performanceData.length;
                        const divisor = numPoints > 1 ? numPoints - 1 : 1;
                        const xPercentBase = numPoints > 1 ? (index / divisor) : 0.5;
                        const leftPercent = (xPercentBase * 100);

                        return (
                          <div 
                            key={month.month} 
                            className={styles.xTick}
                            style={{ 
                              left: `${leftPercent}%`,
                              transform: `translateX(-50%)`
                            }}
                          >
                          </div>
                        );
                      })}
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

            <div className={styles.chartLegend}>
              <div className={styles.legendItem}><div className={styles.legendColor} style={{ backgroundColor: isPositiveTrend ? '#16a34a' : '#dc2626' }} /><span>Valor do Investimento</span></div>
              <div className={styles.legendItem}><div className={styles.legendLine} /><span>Tendência {isPositiveTrend ? 'Positiva' : 'Negativa'}</span></div>
              <div className={styles.performanceIndicator}><span>Performance: </span><strong style={{ color: totalReturnPercentage >= 0 ? '#16a34a' : '#dc2626' }}>{totalReturnPercentage >= 0 ? '✅ ' : '❌ '}{totalReturnPercentage.toFixed(2)}%</strong></div>
            </div>
          </div>
        )}

        {activeTab === 'table' && (
          <div className={styles.performanceTable}>
            <h4>Performance Mensal Detalhada</h4>
            <div className={styles.tableContainer}>
              {isLoading ? ( 
                <div className={styles.loadingState}><p>Carregando dados...</p></div> 
              ) : 
              performanceData.length > 0 ? (
                <table className={styles.performanceTableTable}>
                  <thead>
                    <tr>
                      <th className={styles.performanceTableHead}>Mês</th>
                      <th className={styles.performanceTableHead}>Valor Acumulado</th>
                      <th className={styles.performanceTableHead}>Retorno (R$)</th>
                      <th className={styles.performanceTableHead}>Retorno (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceData.map((month) => (
                      <tr key={month.month} className={styles.performanceTableRow}>
                        <td className={styles.performanceTableCell}>
                          <span className={styles.monthBadge}>{month.month}</span>
                        </td>
                        <td className={styles.performanceTableCell}>
                          <strong>{formatCurrency(month.value)}</strong>
                        </td>
                        <td className={styles.performanceTableCell} style={{ color: month.return >= 0 ? '#16a34a' : '#dc2626' }}>
                          <div className={styles.returnCell}>
                            {month.return >= 0 ? '↗' : '↘'} {formatCurrency(month.return)}
                          </div>
                        </td>
                        <td className={styles.performanceTableCell} style={{ color: month.returnPercentage >= 0 ? '#16a34a' : '#dc2626' }}>
                          <div className={styles.returnCell}>
                            {month.returnPercentage >= 0 ? '+' : ''}{month.returnPercentage.toFixed(2)}%
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : ( 
                <div className={styles.emptyState}><p>Nenhum dado disponível</p></div> 
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
                  <div className={styles.statItem}><span>Meses Positivos</span><strong style={{ color: '#16a34a' }}>{positiveMonths}</strong></div>
                  <div className={styles.statItem}><span>Meses Negativos</span><strong style={{ color: '#dc2626' }}>{negativeMonths}</strong></div>
                  <div className={styles.statItem}><span>Taxa de Sucesso</span><strong style={{ color: successRate >= 50 ? '#16a34a' : '#dc2626' }}>{successRate.toFixed(1)}%</strong></div>
                </div>
              </div>
              <div className={styles.analysisCard}>
                <h5>⭐ Melhor Mês</h5>
                {bestMonth ? ( <div className={styles.bestWorstMonth}><span className={styles.monthName}>{bestMonth.month}</span><strong style={{ color: '#16a34a' }}>+{bestMonth.returnPercentage.toFixed(2)}%</strong><span className={styles.monthValue}>{formatCurrency(bestMonth.return)}</span></div> ) : ( <p>Nenhum dado disponível</p> )}
              </div>
              <div className={styles.analysisCard}>
                <h5>📉 Pior Mês</h5>
                {worstMonth ? ( <div className={styles.bestWorstMonth}><span className={styles.monthName}>{worstMonth.month}</span><strong style={{ color: '#dc2626' }}>{worstMonth.returnPercentage.toFixed(2)}%</strong><span className={styles.monthValue}>{formatCurrency(worstMonth.return)}</span></div> ) : ( <p>Nenhum dado disponível</p> )}
              </div>
              <div className={styles.analysisCard}>
                <h5>📊 Volatilidade</h5>
                <div className={styles.volatilityInfo}><span>Variação Total</span><strong>{formatCurrency(maxValue - minValue)}</strong><span>Máximo: {formatCurrency(maxValue)}</span><span>Mínimo: {formatCurrency(minValue)}</span></div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.performanceSummary}>
          <div className={styles.summaryCard}>
            <h5>💰 Valor Atual Projetado</h5>
            <motion.span className={styles.currentValue} initial={{ scale: 0.8 }} animate={{ scale: 1 }}>{formatCurrency(currentValue)}</motion.span>
          </div>
          <div className={styles.summaryCard}>
            <h5>📈 Tendência</h5>
            <span className={styles.trendIndicator} style={{ color: isPositiveTrend ? '#16a34a' : '#dc2626' }}>{isPositiveTrend ? '↗ Em Alta' : '↘ Em Baixa'}</span>
          </div>
          <div className={styles.summaryCard}>
            <h5>🎯 Performance</h5>
            <span className={styles.performanceRating} style={{ color: totalReturnPercentage >= 0 ? '#16a34a' : '#dc2626', background: totalReturnPercentage >= 0 ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)' }}>
              {totalReturnPercentage >= 0 ? '✅ ' : '❌ '}{totalReturnPercentage.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}