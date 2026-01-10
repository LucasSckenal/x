"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
  Plus,
  Calendar,
  Wallet,
  ShoppingBag,
  Home as HomeIcon,
  Zap,
  AlertCircle,
  X,
  Lightbulb,
  Eye,
  EyeOff,
  // Ícones Categorias
  Pizza,
  CarFront,
  Clapperboard,
  HeartPulse,
  BookOpen,
  Banknote,
  TrendingUp,
  Package,
  CreditCard,
  PartyPopper,
  Plane,
  Gamepad2,
  Gift,
  Smartphone,
  Globe,
  Droplet,
  Flame,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { motion, AnimatePresence } from "framer-motion";

import styles from "./HomePage.module.scss";

// --- CONFIGURAÇÃO ---
export const transactionCategories = [
  { value: "Alimentação", label: "Alimentação", icon: Pizza },
  { value: "Transporte", label: "Transporte", icon: CarFront },
  { value: "Compras", label: "Compras", icon: ShoppingBag },
  { value: "Entretenimento", label: "Entretenimento", icon: Clapperboard },
  { value: "Saúde", label: "Saúde", icon: HeartPulse },
  { value: "Educação", label: "Educação", icon: BookOpen },
  { value: "Salário", label: "Salário", icon: Banknote },
  { value: "Investimentos", label: "Investimentos", icon: TrendingUp },
  { value: "Outros", label: "Outros", icon: Package },
  { value: "Cartão de Crédito", label: "Cartão de Crédito", icon: CreditCard },
  { value: "Lazer", label: "Lazer", icon: PartyPopper },
  { value: "Moradia", label: "Moradia", icon: HomeIcon },
  { value: "Viagem", label: "Viagem", icon: Plane },
  { value: "Jogos", label: "Jogos", icon: Gamepad2 },
  { value: "Presente", label: "Presente", icon: Gift },
  { value: "Celular", label: "Celular", icon: Smartphone },
  { value: "Internet", label: "Internet", icon: Globe },
  { value: "Água", label: "Água", icon: Droplet },
  { value: "Luz", label: "Luz", icon: Lightbulb },
  { value: "Gás", label: "Gás", icon: Flame },
];

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  date: any;
}

interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  emoji: string;
  isCompleted: boolean;
}

const COLORS = [
  "#8257e5",
  "#00B37E",
  "#FBA94C",
  "#FF669D",
  "#0088FE",
  "#6AD2FF",
];

const DAILY_TIPS = [
  {
    id: 1,
    text: "Separe 10% do que receber assim que cair na conta.",
    category: "Investimento",
  },
  {
    id: 2,
    text: "Revise seus gastos semanalmente para identificar gargalos.",
    category: "Economia",
  },
  {
    id: 3,
    text: "Metas claras aceleram a conquista de objetivos.",
    category: "Metas",
  },
];

const EMOJI_OPTIONS = [
  "🏠",
  "🚗",
  "✈️",
  "🎓",
  "💍",
  "💻",
  "🏥",
  "🎮",
  "👶",
  "💼",
  "🎯",
  "💰",
];

const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value
  );

const getDynamicGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12)
    return {
      text: "Bom dia",
      icon: "☀️",
      subtext: "Comece o dia com o pé direito.",
    };
  if (hour >= 12 && hour < 18)
    return {
      text: "Boa tarde",
      icon: "🌤️",
      subtext: "Mantenha o foco nos seus objetivos.",
    };
  return {
    text: "Boa noite",
    icon: "🌙",
    subtext: "Hora de ver como foi o seu dia.",
  };
};

const renderCategoryIcon = (categoryName: string, size: number = 18) => {
  const normalizedName = categoryName || "Outros";
  const found = transactionCategories.find((c) => c.value === normalizedName);
  const IconComponent = found ? found.icon : Package;
  return <IconComponent size={size} />;
};

// --- MODAIS ---
const NewGoalModal = ({
  isOpen,
  onClose,
  user,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}) => {
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount || !user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "users", user.uid, "goals"), {
        title,
        targetAmount: parseFloat(targetAmount),
        currentAmount: 0,
        emoji,
        isCompleted: false,
        createdAt: new Date(),
      });
      onClose();
      setTitle("");
      setTargetAmount("");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={styles.modal}
      >
        <div className={styles.modalHeader}>
          <h3>Nova Meta</h3>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.emojiGrid}>
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={emoji === e ? styles.selected : ""}
              >
                {e}
              </button>
            ))}
          </div>
          <input
            className={styles.inputField}
            placeholder="Nome da Meta"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            className={styles.inputField}
            type="number"
            placeholder="Valor Alvo (R$)"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className={styles.btnPrimary}
          >
            {loading ? "Criando..." : "Criar Meta"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const AddFundsModal = ({
  isOpen,
  onClose,
  goal,
  user,
}: {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  user: User | null;
}) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !goal || !user) return;
    setLoading(true);
    try {
      const valor = parseFloat(amount);
      const newAmount = goal.currentAmount + valor;
      await updateDoc(doc(db, "users", user.uid, "goals", goal.id), {
        currentAmount: newAmount,
        isCompleted: newAmount >= goal.targetAmount,
      });
      await addDoc(collection(db, "users", user.uid, "transactions"), {
        type: "expense",
        amount: valor,
        description: `Investimento: ${goal.title}`,
        category: "Investimentos",
        date: new Date(),
      });
      onClose();
      setAmount("");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  if (!isOpen || !goal) return null;
  return (
    <div className={styles.modalOverlay}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={styles.modal}
      >
        <div className={styles.modalHeader}>
          <h3>Investir em {goal.emoji}</h3>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            className={styles.inputField}
            type="number"
            placeholder="Valor (R$)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className={styles.btnPrimary}
          >
            {loading ? "Confirmar" : "Confirmar"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
  const [isGoalModalOpen, setGoalModalOpen] = useState(false);
  const [isFundsModalOpen, setFundsModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const qTrans = query(
          collection(db, "users", currentUser.uid, "transactions"),
          orderBy("date", "desc")
        );
        const unsubTrans = onSnapshot(qTrans, (s) =>
          setTransactions(
            s.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction))
          )
        );
        const qGoals = query(collection(db, "users", currentUser.uid, "goals"));
        const unsubGoals = onSnapshot(qGoals, (s) =>
          setGoals(s.docs.map((d) => ({ id: d.id, ...d.data() } as Goal)))
        );
        setLoading(false);
        return () => {
          unsubTrans();
          unsubGoals();
        };
      } else {
        setTransactions([]);
        setGoals([]);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const expensesByCategory = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === "expense");
    const totals: { [key: string]: number } = {};
    expenses.forEach((t) => {
      const cat = t.category || "Outros";
      totals[cat] = (totals[cat] || 0) + Number(t.amount);
    });
    return Object.keys(totals)
      .map((k) => ({ name: k, value: totals[k] }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const activeData = useMemo(
    () =>
      expensesByCategory.filter(
        (item) => !hiddenCategories.includes(item.name)
      ),
    [expensesByCategory, hiddenCategories]
  );
  const visibleTotal = activeData.reduce((acc, curr) => acc + curr.value, 0);

  const toggleCategory = (name: string) => {
    setHiddenCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const { receitas, despesas, saldo } = useMemo(() => {
    const r = transactions
      .filter((t) => t.type === "income")
      .reduce((a, c) => a + Number(c.amount), 0);
    const d = transactions
      .filter((t) => t.type === "expense")
      .reduce((a, c) => a + Number(c.amount), 0);
    return { receitas: r, despesas: d, saldo: r - d };
  }, [transactions]);

  const filteredTransactions = transactions.filter((t) =>
    (t.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  const mainGoal = goals.find((g) => !g.isCompleted) || goals[0];
  const greeting = getDynamicGreeting();

  // Inicial do nome para o fallback
  const userInitial = user?.displayName
    ? user.displayName[0].toUpperCase()
    : "U";

  if (loading)
    return (
      <div className={styles.layoutContainer}>
        <Sidebar />
        <main
          className={styles.mainContent}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <span>Carregando...</span>
        </main>
      </div>
    );

  return (
    <div className={styles.layoutContainer}>
      <Sidebar />
      <main className={styles.mainContent}>
        {/* HEADER COM FOTO E SAUDAÇÃO */}
        <header className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            {/* Lógica da Foto */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className={styles.avatarContainer}
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Perfil"
                  className={styles.profileImage}
                />
              ) : (
                <div className={styles.profileFallback}>{userInitial}</div>
              )}
            </motion.div>

            <div className={styles.headerTexts}>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                {greeting.text},{" "}
                {user?.displayName?.split(" ")[0] || "Visitante"}!
                <span style={{ fontSize: "1.4rem" }}>{greeting.icon}</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                {greeting.subtext}
              </motion.p>
            </div>
          </div>

          <div className={styles.dateBadge}>
            <Calendar size={14} />
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>
        </header>

        <div className={styles.bentoGrid}>
          {/* SALDO */}
          <div className={`${styles.card} ${styles.cardBalance}`}>
            <div className={styles.balanceContent}>
              <h3>Saldo Disponível</h3>
              <div className={styles.balanceValue}>{formatMoney(saldo)}</div>
              <div className={styles.statsRow}>
                <div className={styles.statItem}>
                  <div className={`${styles.statIcon} ${styles.up}`}>
                    <ArrowUpCircle size={16} />
                  </div>
                  <div className={styles.statTexts}>
                    <span className={styles.label}>Entradas</span>
                    <span className={styles.value}>
                      {formatMoney(receitas)}
                    </span>
                  </div>
                </div>
                <div className={styles.statItem}>
                  <div className={`${styles.statIcon} ${styles.down}`}>
                    <ArrowDownCircle size={16} />
                  </div>
                  <div className={styles.statTexts}>
                    <span className={styles.label}>Saídas</span>
                    <span className={styles.value}>
                      {formatMoney(despesas)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DICA */}
          <div className={`${styles.card} ${styles.cardTip}`}>
            <div className={styles.tipHeader}>
              <div className={styles.tipLabel}>
                <Lightbulb size={18} color="#FBA94C" /> <span>Dica do Dia</span>
              </div>
            </div>
            <p className={styles.tipText}>{DAILY_TIPS[0].text}</p>
          </div>

          {/* METAS */}
          <div className={`${styles.card} ${styles.cardGoals}`}>
            <div className={styles.goalHeader}>
              <span>Meta Principal</span>
              <button
                className={styles.btnAddGoal}
                onClick={() => setGoalModalOpen(true)}
              >
                <Plus size={14} />
              </button>
            </div>
            {mainGoal ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div className={styles.goalInfo}>
                  <h4>
                    {mainGoal.emoji} {mainGoal.title}
                  </h4>
                </div>
                <div className={styles.progressContainer}>
                  <div
                    className={styles.bar}
                    style={{
                      width: `${Math.min(
                        (mainGoal.currentAmount / mainGoal.targetAmount) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
                <div className={styles.goalFooter}>
                  <span>
                    {formatMoney(mainGoal.currentAmount)} /{" "}
                    {formatMoney(mainGoal.targetAmount)}
                  </span>
                  <button
                    className={styles.btnInvest}
                    onClick={() => {
                      setSelectedGoal(mainGoal);
                      setFundsModalOpen(true);
                    }}
                  >
                    Investir
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={styles.emptyGoal}
                onClick={() => setGoalModalOpen(true)}
              >
                Nova Meta +
              </div>
            )}
          </div>

          {/* GRÁFICO */}
          <div className={`${styles.card} ${styles.cardChart}`}>
            <div className={styles.chartHeader}>
              <h3>Gastos por Categoria</h3>
            </div>
            {expensesByCategory.length > 0 ? (
              <div className={styles.chartContent}>
                <div className={styles.pieWrapper}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={activeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        cornerRadius={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {activeData.map((entry, index) => {
                          const originalIndex = expensesByCategory.findIndex(
                            (e) => e.name === entry.name
                          );
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[originalIndex % COLORS.length]}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip
                        cursor={false}
                        contentStyle={{
                          background: "#121214",
                          border: "1px solid #202024",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                        formatter={(val: number) => formatMoney(val)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className={styles.centerLabel}>
                    <span>Total</span>
                    <strong>{formatMoney(visibleTotal)}</strong>
                  </div>
                </div>
                <div className={styles.interactiveLegend}>
                  {expensesByCategory.map((entry, index) => {
                    const isHidden = hiddenCategories.includes(entry.name);
                    return (
                      <div
                        key={index}
                        className={`${styles.legendRow} ${
                          isHidden ? styles.hidden : ""
                        }`}
                        onClick={() => toggleCategory(entry.name)}
                      >
                        <div className={styles.legendLeft}>
                          <div
                            className={styles.dot}
                            style={{
                              background: isHidden
                                ? "#333"
                                : COLORS[index % COLORS.length],
                            }}
                          />
                          <span
                            style={{
                              marginRight: "8px",
                              display: "flex",
                              alignItems: "center",
                              color: "#7C7C8A",
                            }}
                          >
                            {renderCategoryIcon(entry.name, 16)}
                          </span>
                          <span className={styles.catName}>{entry.name}</span>
                        </div>
                        <div className={styles.legendRight}>
                          <span>{formatMoney(entry.value)}</span>
                          {isHidden ? (
                            <EyeOff size={14} className={styles.eyeIcon} />
                          ) : (
                            <Eye size={14} className={styles.eyeIcon} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>Sem dados</div>
            )}
          </div>

          {/* TRANSAÇÕES */}
          <div className={`${styles.card} ${styles.cardTransactions}`}>
            <div className={styles.tHeader}>
              <h3>Histórico</h3>
              <div className={styles.searchContainer}>
                <Search className={styles.searchIcon} size={14} />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar..."
                />
              </div>
            </div>
            <div className={styles.tList}>
              {filteredTransactions.map((t) => (
                <div key={t.id} className={styles.tItem}>
                  <div className={styles.tIcon}>
                    {renderCategoryIcon(t.category)}
                  </div>
                  <div className={styles.tContent}>
                    <span className={styles.desc}>{t.description}</span>
                    <span className={styles.cat}>
                      {t.date?.seconds
                        ? new Date(t.date.seconds * 1000).toLocaleDateString()
                        : "-"}
                    </span>
                  </div>
                  <span
                    className={`${styles.tAmount} ${
                      t.type === "income" ? styles.inc : styles.exp
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"} {formatMoney(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isGoalModalOpen && (
          <NewGoalModal
            isOpen={isGoalModalOpen}
            onClose={() => setGoalModalOpen(false)}
            user={user}
          />
        )}
        {isFundsModalOpen && (
          <AddFundsModal
            isOpen={isFundsModalOpen}
            onClose={() => setFundsModalOpen(false)}
            goal={selectedGoal}
            user={user}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
