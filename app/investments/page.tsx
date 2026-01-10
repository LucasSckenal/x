// app/investments/page.tsx
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Edit3,
  Trash2,
  DollarSign,
  BarChart3,
  PieChart,
  Filter,
  Grid,
  List,
  Download,
  Share2,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  X,
  AlertTriangle,
  Clock,
  Calendar,
  Activity,
} from "lucide-react";

import Header from "../components/Header/Header";
import { db, auth } from "../lib/firebase";
import { useSettings } from "../contexts/SettingsContext";

import styles from "./Investments.module.scss";

// Interface baseada na estrutura real do Firebase
interface FirebaseInvestment {
  id: string;
  name: string;
  symbol: string;
  type: string;
  value: number;
  createdAt: any;
  updatedAt?: any;
}

interface InvestmentSummary {
  totalInvested: number;
  totalCurrentValue: number;
  totalReturn: number;
  returnPercentage: number;
  byType: { [key: string]: number };
  performance: "up" | "down";
}

const InvestmentTypeConfig = {
  "Renda Fixa": {
    label: "Renda Fixa",
    color: "#10B981",
    icon: "📊",
    bgColor: "rgba(16, 185, 129, 0.1)",
  },
  Ação: {
    label: "Ações",
    color: "#3B82F6",
    icon: "📈",
    bgColor: "rgba(59, 130, 246, 0.1)",
  },
  Fundo: {
    label: "Fundos",
    color: "#8B5CF6",
    icon: "🏦",
    bgColor: "rgba(139, 92, 246, 0.1)",
  },
  Cripto: {
    label: "Cripto",
    color: "#F59E0B",
    icon: "₿",
    bgColor: "rgba(245, 158, 11, 0.1)",
  },
  Outro: {
    label: "Outros",
    color: "#6B7280",
    icon: "💼",
    bgColor: "rgba(107, 114, 128, 0.1)",
  },
};

// Componente de Card de Resumo Melhorado
const SummaryCard = ({
  title,
  value,
  change,
  subtitle,
  icon: Icon,
  trend,
  onClick,
}: any) => (
  <motion.div
    className={styles.summaryCard}
    whileHover={{ y: -4, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: "spring", stiffness: 300 }}
    onClick={onClick}
  >
    <div className={styles.summaryHeader}>
      <div className={styles.summaryIconWrapper}>
        <Icon size={20} className={styles.summaryIcon} />
      </div>
      <div
        className={`${styles.trendIndicator} ${
          trend === "up" ? styles.trendUp : styles.trendDown
        }`}
      >
        {trend === "up" ? (
          <ArrowUpRight size={14} />
        ) : (
          <ArrowDownRight size={14} />
        )}
        <span>{change}</span>
      </div>
    </div>
    <div className={styles.summaryContent}>
      <h3 className={styles.summaryValue}>{value}</h3>
      <p className={styles.summaryTitle}>{title}</p>
      <p className={styles.summarySubtitle}>{subtitle}</p>
    </div>
    <div className={styles.summaryFooter}>
      <div className={styles.progressBar}>
        <div
          className={`${styles.progressFill} ${
            trend === "up" ? styles.progressUp : styles.progressDown
          }`}
          style={{ width: "75%" }}
        />
      </div>
    </div>
  </motion.div>
);

// Componente de Performance por Tipo
const TypePerformanceCard = ({
  type,
  value,
  percentage,
  currency,
  onClick,
}: any) => {
  const config =
    InvestmentTypeConfig[type as keyof typeof InvestmentTypeConfig] ||
    InvestmentTypeConfig.Outro;

  const formatCurrency = (value: number): string => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <motion.div
      className={styles.performanceCard}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <div className={styles.performanceHeader}>
        <div
          className={styles.typeIconWrapper}
          style={{ backgroundColor: config.bgColor, color: config.color }}
        >
          <span>{config.icon}</span>
        </div>
        <div className={styles.performanceInfo}>
          <span className={styles.typeName}>{config.label}</span>
          <span className={styles.performanceValue}>
            {formatCurrency(value)}
          </span>
        </div>
      </div>
      <div className={styles.performancePercentage}>
        <span>{percentage}%</span>
      </div>
    </motion.div>
  );
};

// Componente de Card de Investimento (Grid)
const InvestmentGridCard = ({
  investment,
  currency,
  onEdit,
  onDelete,
  onViewDetails,
}: {
  investment: FirebaseInvestment;
  currency: string;
  onEdit: (investment: FirebaseInvestment) => void;
  onDelete: (id: string) => void;
  onViewDetails: (investment: FirebaseInvestment) => void;
}) => {
  const config =
    InvestmentTypeConfig[
      investment.type as keyof typeof InvestmentTypeConfig
    ] || InvestmentTypeConfig.Outro;

  const formatCurrency = (value: number): string => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <motion.div
      className={styles.investmentGridCard}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300 }}
      onClick={() => onViewDetails(investment)}
    >
      <div className={styles.cardHeader}>
        <div
          className={styles.typeBadge}
          style={{ backgroundColor: config.bgColor, color: config.color }}
        >
          <span className={styles.typeIcon}>{config.icon}</span>
          <span className={styles.typeLabel}>{config.label}</span>
        </div>
        <div className={styles.cardActions}>
          <button
            className={styles.actionBtn}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(investment);
            }}
            title="Editar investimento"
          >
            <Edit3 size={14} />
          </button>
          <button
            className={styles.actionBtn}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(investment.id);
            }}
            title="Excluir investimento"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className={styles.cardBody}>
        <h4 className={styles.investmentName}>{investment.name}</h4>
        {investment.symbol && (
          <p className={styles.investmentSymbol}>{investment.symbol}</p>
        )}
        <div className={styles.valueContainer}>
          <span className={styles.valueLabel}>Valor Atual</span>
          <span className={styles.valueAmount}>
            {formatCurrency(investment.value)}
          </span>
        </div>
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.performanceIndicator}>
          <TrendingUp size={12} />
          <span>+5.2%</span>
        </div>
        <span className={styles.updateText}>Atualizado hoje</span>
      </div>
    </motion.div>
  );
};

// Componente de Linha de Investimento (Lista)
const InvestmentListItem = ({
  investment,
  currency,
  onEdit,
  onDelete,
  onViewDetails,
}: {
  investment: FirebaseInvestment;
  currency: string;
  onEdit: (investment: FirebaseInvestment) => void;
  onDelete: (id: string) => void;
  onViewDetails: (investment: FirebaseInvestment) => void;
}) => {
  const config =
    InvestmentTypeConfig[
      investment.type as keyof typeof InvestmentTypeConfig
    ] || InvestmentTypeConfig.Outro;

  const formatCurrency = (value: number): string => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "-";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("pt-BR");
    } catch {
      return "-";
    }
  };

  return (
    <motion.div
      className={styles.investmentListItem}
      whileHover={{ backgroundColor: "var(--panel)" }}
      transition={{ duration: 0.2 }}
      onClick={() => onViewDetails(investment)}
    >
      <div className={styles.listCell} style={{ width: "25%" }}>
        <div className={styles.assetInfo}>
          <div
            className={styles.typeIndicator}
            style={{ backgroundColor: config.bgColor, color: config.color }}
          >
            {config.icon}
          </div>
          <div className={styles.assetDetails}>
            <span className={styles.assetName}>{investment.name}</span>
            {investment.symbol && (
              <span className={styles.assetSymbol}>{investment.symbol}</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.listCell} style={{ width: "15%" }}>
        <span
          className={styles.typeTag}
          style={{ color: config.color, backgroundColor: config.bgColor }}
        >
          {config.label}
        </span>
      </div>

      <div className={styles.listCell} style={{ width: "20%" }}>
        <span className={styles.valueText}>
          {formatCurrency(investment.value)}
        </span>
      </div>

      <div className={styles.listCell} style={{ width: "15%" }}>
        <div className={styles.performanceBadge}>
          <TrendingUp size={12} />
          <span>+5.2%</span>
        </div>
      </div>

      <div className={styles.listCell} style={{ width: "15%" }}>
        <span className={styles.dateText}>
          {formatDate(investment.createdAt)}
        </span>
      </div>

      <div className={styles.listCell} style={{ width: "10%" }}>
        <div className={styles.listActions}>
          <button
            className={styles.listActionBtn}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(investment);
            }}
            title="Editar"
          >
            <Edit3 size={14} />
          </button>
          <button
            className={styles.listActionBtn}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(investment.id);
            }}
            title="Excluir"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Modal para Adicionar/Editar Investimento
const InvestmentModal = ({
  isOpen,
  onClose,
  investment,
  onSave,
  currency,
}: {
  isOpen: boolean;
  onClose: () => void;
  investment?: FirebaseInvestment | null;
  onSave: (data: any) => void;
  currency: string;
}) => {
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    type: "Renda Fixa",
    value: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (investment) {
      setFormData({
        name: investment.name,
        symbol: investment.symbol || "",
        type: investment.type,
        value: investment.value.toString(),
      });
    } else {
      setFormData({
        name: "",
        symbol: "",
        type: "Renda Fixa",
        value: "",
      });
    }
  }, [investment, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.value) return;

    setLoading(true);
    try {
      const investmentData = {
        name: formData.name,
        symbol: formData.symbol || "",
        type: formData.type,
        value: parseFloat(formData.value),
        updatedAt: new Date(),
        ...(investment ? {} : { createdAt: new Date() }),
      };

      await onSave(investmentData);
      onClose();
    } catch (error) {
      console.error("Erro ao salvar investimento:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop}>
      <motion.div
        className={`${styles.modal} ${styles.modalMedium}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className={styles.modalHeader}>
          <h3>{investment ? "Editar" : "Novo"} Investimento</h3>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label>Nome do Investimento *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Ex: URPR11, Tesouro Selic..."
              required
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Símbolo/Ticker</label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, symbol: e.target.value }))
                }
                placeholder="Ex: URPR11, BTC..."
              />
            </div>

            <div className={styles.formGroup}>
              <label>Tipo</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, type: e.target.value }))
                }
                required
              >
                {Object.entries(InvestmentTypeConfig).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Valor Atual ({currency}) *</label>
            <input
              type="number"
              step="0.01"
              value={formData.value}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, value: e.target.value }))
              }
              placeholder="0,00"
              min="0"
              required
            />
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={styles.saveButton}
            >
              {loading ? "Salvando..." : investment ? "Atualizar" : "Adicionar"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Modal de Confirmação de Exclusão
const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  investment,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  investment: FirebaseInvestment | null;
  onConfirm: () => void;
}) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  if (!isOpen || !investment) return null;

  return (
    <div className={styles.modalBackdrop}>
      <motion.div
        className={`${styles.modal} ${styles.modalSmall}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className={styles.modalHeader}>
          <h3>Excluir Investimento</h3>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.confirmContent}>
          <AlertTriangle size={48} className={styles.confirmIcon} />
          <p>
            Tem certeza que deseja excluir <strong>{investment.name}</strong>?
          </p>
          <p className={styles.warningText}>
            Esta ação não pode ser desfeita.
          </p>
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            onClick={onClose}
            className={styles.cancelButton}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={styles.deleteConfirmButton}
          >
            {loading ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Modal de Detalhes do Investimento
const InvestmentDetailsModal = ({
  isOpen,
  onClose,
  investment,
  currency,
}: {
  isOpen: boolean;
  onClose: () => void;
  investment: FirebaseInvestment | null;
  currency: string;
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "performance" | "analysis"
  >("overview");

  if (!isOpen || !investment) return null;

  const config =
    InvestmentTypeConfig[
      investment.type as keyof typeof InvestmentTypeConfig
    ] || InvestmentTypeConfig.Outro;

  const formatCurrency = (value: number): string => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "Não informado";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("pt-BR");
    } catch {
      return "Data inválida";
    }
  };

  // Dados simulados para o gráfico de performance
  const performanceData = [
    { month: "Jan", value: 1000, return: 2.5 },
    { month: "Fev", value: 1100, return: 5.0 },
    { month: "Mar", value: 1050, return: 2.8 },
    { month: "Abr", value: 1200, return: 8.2 },
    { month: "Mai", value: 1150, return: 4.1 },
    { month: "Jun", value: 1300, return: 12.3 },
    { month: "Jul", value: 1250, return: 9.8 },
    { month: "Ago", value: 1400, return: 15.6 },
    { month: "Set", value: 1350, return: 12.9 },
    { month: "Out", value: 1500, return: 18.4 },
    { month: "Nov", value: 1450, return: 16.2 },
    { month: "Dez", value: investment.value, return: 22.0 },
  ];

  return (
    <div className={styles.modalBackdrop}>
      <motion.div
        className={`${styles.modal} ${styles.modalLarge}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className={styles.modalHeader}>
          <h3>Detalhes do Investimento</h3>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.detailsContent}>
          {/* Header com informações principais */}
          <div className={styles.detailsHeader}>
            <div className={styles.investmentType}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <span style={{ fontSize: "2rem" }}>{config.icon}</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: "1.5rem" }}>
                    {investment.name}
                  </h4>
                  {investment.symbol && (
                    <p
                      style={{
                        margin: 0,
                        color: "var(--muted)",
                        fontSize: "1rem",
                      }}
                    >
                      {investment.symbol} • {config.label}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.investmentStats}>
              <div className={styles.stat}>
                <DollarSign size={20} />
                <span>Valor Atual:</span>
                <strong>{formatCurrency(investment.value)}</strong>
              </div>
              <div className={styles.stat}>
                <Activity size={20} />
                <span>Performance:</span>
                <strong style={{ color: "#10B981" }}>+22.0%</strong>
              </div>
              <div className={styles.stat}>
                <Calendar size={20} />
                <span>Adicionado:</span>
                <strong>{formatDate(investment.createdAt)}</strong>
              </div>
            </div>
          </div>

          {/* Abas de navegação */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${
                activeTab === "overview" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("overview")}
            >
              Visão Geral
            </button>
            <button
              className={`${styles.tab} ${
                activeTab === "performance" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("performance")}
            >
              Desempenho
            </button>
            <button
              className={`${styles.tab} ${
                activeTab === "analysis" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("analysis")}
            >
              Análise
            </button>
          </div>

          {/* Conteúdo das abas */}
          {activeTab === "overview" && (
            <div className={styles.analysisTab}>
              <h4>Informações do Investimento</h4>
              <div className={styles.analysisGrid}>
                <div className={styles.analysisCard}>
                  <h5>Detalhes Básicos</h5>
                  <div className={styles.statsList}>
                    <div className={styles.statItem}>
                      <span>Nome:</span>
                      <strong>{investment.name}</strong>
                    </div>
                    <div className={styles.statItem}>
                      <span>Símbolo:</span>
                      <strong>{investment.symbol || "N/A"}</strong>
                    </div>
                    <div className={styles.statItem}>
                      <span>Tipo:</span>
                      <strong>{config.label}</strong>
                    </div>
                    <div className={styles.statItem}>
                      <span>Data de Criação:</span>
                      <strong>{formatDate(investment.createdAt)}</strong>
                    </div>
                  </div>
                </div>

                <div className={styles.analysisCard}>
                  <h5>Valores</h5>
                  <div className={styles.statsList}>
                    <div className={styles.statItem}>
                      <span>Valor Atual:</span>
                      <strong>{formatCurrency(investment.value)}</strong>
                    </div>
                    <div className={styles.statItem}>
                      <span>Valorização Total:</span>
                      <strong style={{ color: "#10B981" }}>+22.0%</strong>
                    </div>
                    <div className={styles.statItem}>
                      <span>Valorização Mensal:</span>
                      <strong style={{ color: "#10B981" }}>+3.2%</strong>
                    </div>
                  </div>
                </div>

                <div className={styles.analysisCard}>
                  <h5>Performance</h5>
                  <div className={styles.bestWorstMonth}>
                    <div>
                      <div className={styles.monthName}>Melhor Mês</div>
                      <div style={{ color: "#10B981", fontWeight: "bold" }}>
                        Outubro (+8.4%)
                      </div>
                    </div>
                    <div>
                      <div className={styles.monthName}>Pior Mês</div>
                      <div style={{ color: "#EF4444", fontWeight: "bold" }}>
                        Março (-2.8%)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "performance" && (
            <div className={styles.performanceChart}>
              <div className={styles.chartHeader}>
                <h4>Performance - Últimos 12 Meses</h4>
                <div className={styles.chartControls}>
                  <button
                    className={`${styles.chartTypeButton} ${styles.activeChartType}`}
                  >
                    1A
                  </button>
                  <button className={styles.chartTypeButton}>6M</button>
                  <button className={styles.chartTypeButton}>3M</button>
                  <button className={styles.chartTypeButton}>1M</button>
                </div>
              </div>

              <div className={styles.lineChartContainer}>
                <div className={styles.lineChart}>
                  <div className={styles.yAxis}>
                    {[0, 25, 50, 75, 100].map((tick) => (
                      <div
                        key={tick}
                        className={styles.yTick}
                        style={{ bottom: `${tick}%` }}
                      >
                        <span className={styles.yLabel}>{tick}%</span>
                        <div className={styles.gridLine} />
                      </div>
                    ))}
                  </div>
                  <div className={styles.chartSvgContainer}>
                    <svg
                      className={styles.lineSvg}
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0,100 L8.3,75 L16.6,80 L24.9,65 L33.2,70 L41.5,55 L49.8,60 L58.1,45 L66.4,50 L74.7,35 L83,40 L91.3,25 L100,0"
                        stroke={config.color}
                        strokeWidth="2"
                        fill="none"
                      />
                      <path
                        d="M0,100 L8.3,75 L16.6,80 L24.9,65 L33.2,70 L41.5,55 L49.8,60 L58.1,45 L66.4,50 L74.7,35 L83,40 L91.3,25 L100,0"
                        stroke={config.color}
                        strokeWidth="1"
                        fill={`url(#gradient-${investment.id})`}
                        opacity="0.3"
                      />
                      <defs>
                        <linearGradient
                          id={`gradient-${investment.id}`}
                          x1="0%"
                          y1="0%"
                          x2="0%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            stopColor={config.color}
                            stopOpacity="0.8"
                          />
                          <stop
                            offset="100%"
                            stopColor={config.color}
                            stopOpacity="0.1"
                          />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
                <div className={styles.xAxis}>
                  {performanceData.map((data, index) => (
                    <div
                      key={index}
                      className={styles.xTick}
                      style={{
                        left: `${
                          (index / (performanceData.length - 1)) * 100
                        }%`,
                      }}
                    >
                      <div className={styles.xMarker} />
                      <span className={styles.xLabel}>{data.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.chartLegend}>
                <div className={styles.legendItem}>
                  <div
                    className={styles.legendLine}
                    style={{ background: config.color }}
                  />
                  <span>Performance Acumulada</span>
                </div>
                <div className={styles.performanceIndicator}>
                  Retorno total:{" "}
                  <strong style={{ color: "#10B981" }}>+22.0%</strong>
                </div>
              </div>
            </div>
          )}

          {activeTab === "analysis" && (
            <div className={styles.analysisTab}>
              <h4>Análise Detalhada</h4>
              <div className={styles.performanceSummary}>
                <div className={styles.summaryCard}>
                  <h5>Valor Atual</h5>
                  <span className={styles.currentValue}>
                    {formatCurrency(investment.value)}
                  </span>
                  <span
                    className={styles.trendIndicator}
                    style={{ color: "#10B981" }}
                  >
                    +22.0%
                  </span>
                </div>

                <div className={styles.summaryCard}>
                  <h5>Volatilidade</h5>
                  <span
                    className={styles.performanceRating}
                    style={{
                      background: "rgba(245, 158, 11, 0.1)",
                      color: "#F59E0B",
                    }}
                  >
                    Moderada
                  </span>
                  <div className={styles.volatilityInfo}>
                    <strong>12.5%</strong>
                    <span>Desvio padrão anual</span>
                  </div>
                </div>

                <div className={styles.summaryCard}>
                  <h5>Recomendação</h5>
                  <span
                    className={styles.performanceRating}
                    style={{
                      background: "rgba(16, 185, 129, 0.1)",
                      color: "#10B981",
                    }}
                  >
                    Manter
                  </span>
                  <div className={styles.volatilityInfo}>
                    <strong>Positiva</strong>
                    <span>Tendência de alta</span>
                  </div>
                </div>
              </div>

              <div className={styles.performanceTable}>
                <h4>Histórico Mensal</h4>
                <div className={styles.tableContainer}>
                  <table className={styles.performanceTableTable}>
                    <thead>
                      <tr>
                        <th className={styles.performanceTableHead}>
                          Mês
                        </th>
                        <th className={styles.performanceTableHead}>
                          Valor
                        </th>
                        <th className={styles.performanceTableHead}>
                          Retorno
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceData.map((data, index) => (
                        <tr
                          key={index}
                          className={styles.performanceTableRow}
                        >
                          <td className={styles.performanceTableCell}>
                            <span className={styles.monthBadge}>
                              {data.month}
                            </span>
                          </td>
                          <td className={styles.performanceTableCell}>
                            {formatCurrency(data.value)}
                          </td>
                          <td className={styles.performanceTableCell}>
                            <div
                              className={styles.returnCell}
                              style={{
                                color: data.return >= 0 ? "#10B981" : "#EF4444",
                              }}
                            >
                              {data.return >= 0 ? "↗" : "↘"} {data.return}%
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default function InvestmentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState<FirebaseInvestment[]>([]);
  const [summary, setSummary] = useState<InvestmentSummary>({
    totalInvested: 0,
    totalCurrentValue: 0,
    totalReturn: 0,
    returnPercentage: 0,
    byType: {},
    performance: "up",
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] =
    useState<FirebaseInvestment | null>(null);
  const [selectedInvestment, setSelectedInvestment] =
    useState<FirebaseInvestment | null>(null);
  const [investmentToDelete, setInvestmentToDelete] =
    useState<FirebaseInvestment | null>(null);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "value" | "type" | "date">(
    "date"
  );

  const { settings } = useSettings();
  const currency = settings.currency || "BRL";

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const investmentsQuery = query(
      collection(db, `users/${user.uid}/investments`),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(investmentsQuery, (snapshot) => {
      const investmentsData = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as FirebaseInvestment)
      );

      setInvestments(investmentsData);
      calculateSummary(investmentsData);
    });

    return () => unsubscribe();
  }, [user]);

  const calculateSummary = (investmentsData: FirebaseInvestment[]) => {
    const totalCurrentValue = investmentsData.reduce(
      (sum, inv) => sum + inv.value,
      0
    );
    const totalInvested = totalCurrentValue;
    const totalReturn = 0;
    const returnPercentage = 0;

    const byType: { [key: string]: number } = {};
    investmentsData.forEach((inv) => {
      byType[inv.type] = (byType[inv.type] || 0) + inv.value;
    });

    setSummary({
      totalInvested,
      totalCurrentValue,
      totalReturn,
      returnPercentage,
      byType,
      performance: Math.random() > 0.5 ? "up" : "down",
    });
  };

  const handleAddInvestment = async (investmentData: any) => {
    if (!user) return;

    try {
      await addDoc(
        collection(db, `users/${user.uid}/investments`),
        investmentData
      );
    } catch (error) {
      console.error("Erro ao adicionar investimento:", error);
      throw error;
    }
  };

  const handleEditInvestment = async (investmentData: any) => {
    if (!user || !editingInvestment) return;

    try {
      await updateDoc(
        doc(db, `users/${user.uid}/investments`, editingInvestment.id),
        investmentData
      );
      setEditingInvestment(null);
    } catch (error) {
      console.error("Erro ao editar investimento:", error);
      throw error;
    }
  };

  const handleDeleteInvestment = async (id: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, `users/${user.uid}/investments`, id));
      setInvestmentToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir investimento:", error);
    }
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Filtrar e ordenar investimentos
  const filteredInvestments =
    selectedType === "all"
      ? investments
      : investments.filter((inv) => inv.type === selectedType);

  const sortedInvestments = [...filteredInvestments].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "value":
        return b.value - a.value;
      case "type":
        return a.type.localeCompare(b.type);
      case "date":
      default:
        return (
          new Date(b.createdAt?.toDate?.() || b.createdAt).getTime() -
          new Date(a.createdAt?.toDate?.() || a.createdAt).getTime()
        );
    }
  });

  if (loading) return <div className={styles.loading}>Carregando...</div>;
  if (!user)
    return (
      <div className={styles.loading}>
        Faça login para ver seus investimentos.
      </div>
    );

  return (
    <div className={styles.pageWrap}>
      <Header />

      <main className={styles.container}>
        {/* Header Section */}
        <motion.section
          className={styles.hero}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>
                <TrendingUp size={32} />
                Carteira de Investimentos
              </h1>
              <p className={styles.heroSubtitle}>
                Gerencie e acompanhe o desempenho dos seus investimentos
              </p>
            </div>
            <div className={styles.heroStats}>
              <div className={styles.mainStat}>
                <span className={styles.statLabel}>
                  Valor Total da Carteira
                </span>
                <h2 className={styles.statValue}>
                  {formatCurrency(summary.totalCurrentValue)}
                </h2>
                <div
                  className={`${styles.statChange} ${
                    summary.performance === "up"
                      ? styles.positive
                      : styles.negative
                  }`}
                >
                  {summary.performance === "up" ? (
                    <ArrowUpRight size={16} />
                  ) : (
                    <ArrowDownRight size={16} />
                  )}
                  <span>+2.3% este mês</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.heroActions}>
            <div className={styles.actionGroup}>
              <motion.button
                className={styles.secondaryButton}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Download size={18} />
                Exportar
              </motion.button>
              <motion.button
                className={styles.secondaryButton}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Share2 size={18} />
                Compartilhar
              </motion.button>
            </div>
            <motion.button
              className={styles.primaryButton}
              onClick={() => {
                setEditingInvestment(null);
                setIsModalOpen(true);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus size={18} />
              Novo Investimento
            </motion.button>
          </div>
        </motion.section>

        {/* Summary Cards */}
        <motion.section
          className={styles.summaryGrid}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <SummaryCard
            title="Total Investido"
            value={formatCurrency(summary.totalInvested)}
            change="+12%"
            subtitle="Desde o início"
            icon={DollarSign}
            trend="up"
          />

          <SummaryCard
            title="Retorno Total"
            value={formatCurrency(summary.totalReturn)}
            change="+5.2%"
            subtitle="Este mês"
            icon={TrendingUp}
            trend="up"
          />

          <SummaryCard
            title="Ativos na Carteira"
            value={investments.length.toString()}
            change="+2"
            subtitle="Diversificação"
            icon={PieChart}
            trend="up"
          />

          <SummaryCard
            title="Melhor Desempenho"
            value="+15.3%"
            change="Ações"
            subtitle="Setor de Tecnologia"
            icon={Target}
            trend="up"
          />
        </motion.section>

        {/* Distribuição por Tipo */}
        {Object.keys(summary.byType).length > 0 && (
          <motion.section
            className={styles.distributionSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Distribuição da Carteira</h3>
              <span className={styles.sectionSubtitle}>
                Composição por tipo de investimento
              </span>
            </div>
            <div className={styles.distributionGrid}>
              {Object.entries(summary.byType).map(([type, value]) => {
                const config =
                  InvestmentTypeConfig[
                    type as keyof typeof InvestmentTypeConfig
                  ] || InvestmentTypeConfig.Outro;
                const percentage = (value / summary.totalCurrentValue) * 100;

                return (
                  <TypePerformanceCard
                    key={type}
                    type={type}
                    value={value}
                    percentage={percentage.toFixed(1)}
                    currency={currency}
                    onClick={() =>
                      setSelectedType(type === selectedType ? "all" : type)
                    }
                  />
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Controls Section */}
        <motion.section
          className={styles.controlsSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className={styles.controlsLeft}>
            <div className={styles.viewControls}>
              <button
                className={`${styles.viewButton} ${
                  viewMode === "grid" ? styles.active : ""
                }`}
                onClick={() => setViewMode("grid")}
              >
                <Grid size={16} />
                Grid
              </button>
              <button
                className={`${styles.viewButton} ${
                  viewMode === "list" ? styles.active : ""
                }`}
                onClick={() => setViewMode("list")}
              >
                <List size={16} />
                Lista
              </button>
            </div>

            <select
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="date">Ordenar por: Data</option>
              <option value="name">Ordenar por: Nome</option>
              <option value="value">Ordenar por: Valor</option>
              <option value="type">Ordenar por: Tipo</option>
            </select>
          </div>

          <div className={styles.controlsRight}>
            <div className={styles.filterGroup}>
              <Filter size={16} />
              <select
                className={styles.filterSelect}
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">Todos os Tipos</option>
                {Object.entries(InvestmentTypeConfig).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.section>

        {/* Investments Grid/List */}
        <motion.section
          className={styles.investmentsSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {sortedInvestments.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIllustration}>
                <BarChart3 size={64} />
              </div>
              <h3>Nenhum investimento encontrado</h3>
              <p>
                {selectedType === "all"
                  ? "Comece adicionando seu primeiro investimento para construir sua carteira."
                  : `Nenhum investimento do tipo ${
                      InvestmentTypeConfig[
                        selectedType as keyof typeof InvestmentTypeConfig
                      ]?.label || selectedType
                    } encontrado.`}
              </p>
              {selectedType === "all" && (
                <button
                  className={styles.emptyAction}
                  onClick={() => setIsModalOpen(true)}
                >
                  <Plus size={18} />
                  Adicionar Primeiro Investimento
                </button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className={styles.investmentsGrid}>
              {sortedInvestments.map((investment) => (
                <InvestmentGridCard
                  key={investment.id}
                  investment={investment}
                  currency={currency}
                  onEdit={(inv) => {
                    setEditingInvestment(inv);
                    setIsModalOpen(true);
                  }}
                  onDelete={(id) =>
                    setInvestmentToDelete(
                      investments.find((inv) => inv.id === id) || null
                    )
                  }
                  onViewDetails={setSelectedInvestment}
                />
              ))}
            </div>
          ) : (
            <div className={styles.investmentsList}>
              <div className={styles.listHeader}>
                <div className={styles.listCell} style={{ width: "25%" }}>
                  Ativo
                </div>
                <div className={styles.listCell} style={{ width: "15%" }}>
                  Tipo
                </div>
                <div className={styles.listCell} style={{ width: "20%" }}>
                  Valor
                </div>
                <div className={styles.listCell} style={{ width: "15%" }}>
                  Performance
                </div>
                <div className={styles.listCell} style={{ width: "15%" }}>
                  Data
                </div>
                <div className={styles.listCell} style={{ width: "10%" }}>
                  Ações
                </div>
              </div>
              <div className={styles.listContent}>
                {sortedInvestments.map((investment) => (
                  <InvestmentListItem
                    key={investment.id}
                    investment={investment}
                    currency={currency}
                    onEdit={(inv) => {
                      setEditingInvestment(inv);
                      setIsModalOpen(true);
                    }}
                    onDelete={(id) =>
                      setInvestmentToDelete(
                        investments.find((inv) => inv.id === id) || null
                      )
                    }
                    onViewDetails={setSelectedInvestment}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.section>
      </main>

      {/* Modais */}
      <InvestmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingInvestment(null);
        }}
        investment={editingInvestment}
        onSave={editingInvestment ? handleEditInvestment : handleAddInvestment}
        currency={currency}
      />

      <DeleteConfirmationModal
        isOpen={!!investmentToDelete}
        onClose={() => setInvestmentToDelete(null)}
        investment={investmentToDelete}
        onConfirm={handleDeleteInvestment}
      />

      <InvestmentDetailsModal
        isOpen={!!selectedInvestment}
        onClose={() => setSelectedInvestment(null)}
        investment={selectedInvestment}
        currency={currency}
      />
    </div>
  );
}
