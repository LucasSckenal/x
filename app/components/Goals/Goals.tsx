"use client";

import { useState, useEffect, useMemo } from "react";
import { db, auth } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  addDoc,
  doc,
  updateDoc,
  increment,
  deleteDoc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Target,
  CheckCircle,
  Wallet,
  X,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Coins,
  Calendar,
  Zap,
  Clock,
  Repeat,
} from "lucide-react";
import toast from "react-hot-toast";
import styles from "./Goals.module.scss";

// --- Tipos ---
export interface Goal {
  id: string;
  title: string;
  currentAmount: number;
  targetAmount: number;
  emoji: string;
  createdAt?: any;
}

interface Automation {
  id: string;
  goalId: string;
  amount: number;
  frequency: "daily" | "weekly" | "biweekly" | "monthly" | "yearly";
  nextExecution: string;
  active: boolean;
}

interface ScheduleForm {
  goalId: string;
  amount: string;
  frequency: "daily" | "weekly" | "biweekly" | "monthly" | "yearly";
  startDate: string;
  active: boolean;
}

const goalEmojis = [
  "✈️",
  "🏠",
  "🚗",
  "🎓",
  "💻",
  "🎁",
  "💰",
  "📈",
  "✨",
  "🎸",
  "🏖️",
  "💍",
];

export default function Goals() {
  const [user, setUser] = useState<User | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);

  // Controlo dos Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  // Inputs
  const [depositValue, setDepositValue] = useState("");
  const [newGoal, setNewGoal] = useState({
    title: "",
    target: "",
    initial: "",
    emoji: "💰",
  });

  // Formulário de agendamento
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    goalId: "",
    amount: "",
    frequency: "monthly",
    startDate: new Date().toISOString().split("T")[0],
    active: true,
  });

  // Estados de loading
  const [isDepositing, setIsDepositing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  // Autenticação
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  // Dados em Tempo Real
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/goals`),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Goal[];
      setGoals(data);
    });
    return () => unsub();
  }, [user]);

  // Buscar automações do usuário
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, `users/${user.uid}/automations`));

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Automation[];
      setAutomations(data);
    });

    return () => unsub();
  }, [user]);

  // KPIs (Topo da página)
  const stats = useMemo(() => {
    const totalSaved = goals.reduce(
      (acc, curr) => acc + (curr.currentAmount || 0),
      0
    );
    const completed = goals.filter(
      (g) => g.currentAmount >= g.targetAmount
    ).length;
    return { totalSaved, completed, count: goals.length };
  }, [goals]);

  // Função para calcular valores
  const calculateValues = useMemo(() => {
    if (!selectedGoal) return null;

    const current = selectedGoal.currentAmount;
    const target = selectedGoal.targetAmount;
    const deposit = Number(depositValue) || 0;

    const currentPercent = Math.min((current / target) * 100, 100);
    const newPercent = Math.min(((current + deposit) / target) * 100, 100);
    const incrementPercent = Math.max(newPercent - currentPercent, 0);

    const remaining = Math.max(target - (current + deposit), 0);
    const willComplete = current + deposit >= target;

    return {
      currentPercent,
      newPercent,
      incrementPercent,
      remaining,
      willComplete,
      newTotal: current + deposit,
    };
  }, [selectedGoal, depositValue]);

  // Ações
  const handleCreate = async () => {
    if (!user || !newGoal.title || !newGoal.target)
      return toast.error("Preencha os campos obrigatórios.");
    try {
      await addDoc(collection(db, `users/${user.uid}/goals`), {
        title: newGoal.title,
        targetAmount: Number(newGoal.target),
        currentAmount: Number(newGoal.initial) || 0,
        emoji: newGoal.emoji,
        createdAt: serverTimestamp(),
      });
      toast.success("Meta criada!");
      setIsCreateOpen(false);
      setNewGoal({ title: "", target: "", initial: "", emoji: "💰" });
    } catch (e) {
      toast.error("Erro ao criar meta.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm("Excluir esta meta?")) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/goals`, id));
      toast.success("Meta excluída.");
    } catch (e) {
      toast.error("Erro ao excluir.");
    }
  };

  const handleDeposit = async () => {
    if (!user || !selectedGoal || !depositValue || Number(depositValue) <= 0)
      return;

    setIsDepositing(true);
    try {
      const ref = doc(db, `users/${user.uid}/goals`, selectedGoal.id);
      await updateDoc(ref, { currentAmount: increment(Number(depositValue)) });

      // Animação de sucesso
      setTimeout(() => {
        toast.success(
          `R$ ${Number(depositValue).toLocaleString()} adicionado! 🎉`
        );
        setIsDepositOpen(false);
        setDepositValue("");
        setIsDepositing(false);
      }, 800);
    } catch (e) {
      setIsDepositing(false);
      toast.error("Erro ao depositar.");
    }
  };

  const handleQuickAdd = (amount: number) => {
    const currentVal = Number(depositValue) || 0;
    const newVal = currentVal + amount;
    setDepositValue(newVal.toString());
  };

  const handleCreateAutomation = async () => {
    if (
      !user ||
      !selectedGoal ||
      !scheduleForm.amount ||
      Number(scheduleForm.amount) <= 0
    ) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsScheduling(true);
    try {
      // Calcular próxima execução
      const calculateNextDate = (
        frequency: string,
        startDate: string
      ): string => {
        const start = new Date(startDate);

        switch (frequency) {
          case "daily":
            start.setDate(start.getDate() + 1);
            break;
          case "weekly":
            start.setDate(start.getDate() + 7);
            break;
          case "biweekly":
            start.setDate(start.getDate() + 15);
            break;
          case "monthly":
            start.setMonth(start.getMonth() + 1);
            break;
          case "yearly":
            start.setFullYear(start.getFullYear() + 1);
            break;
        }

        return start.toISOString();
      };

      const automationData = {
        goalId: selectedGoal.id,
        amount: Number(scheduleForm.amount),
        frequency: scheduleForm.frequency,
        nextExecution: calculateNextDate(
          scheduleForm.frequency,
          scheduleForm.startDate
        ),
        active: true,
        createdAt: serverTimestamp(),
      };

      await addDoc(
        collection(db, `users/${user.uid}/automations`),
        automationData
      );

      toast.success("Automação criada com sucesso!");
      setIsScheduleOpen(false);
      setScheduleForm({
        goalId: "",
        amount: "",
        frequency: "monthly",
        startDate: new Date().toISOString().split("T")[0],
        active: true,
      });

      // Fechar o modal de depósito também
      setIsDepositOpen(false);
      setDepositValue("");
    } catch (e) {
      toast.error("Erro ao criar automação.");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleAutomationOptionClick = (
    frequency: "weekly" | "biweekly" | "monthly" | "yearly"
  ) => {
    if (!depositValue || Number(depositValue) <= 0) {
      toast.error("Digite um valor primeiro");
      return;
    }

    // Preencher o formulário com os valores atuais
    setScheduleForm({
      goalId: selectedGoal?.id || "",
      amount: depositValue,
      frequency,
      startDate: new Date().toISOString().split("T")[0],
      active: true,
    });

    // Abrir modal de agendamento
    setIsScheduleOpen(true);
  };

  return (
    <div className={styles.pageContainer}>
      {/* HEADER */}
      <div className={styles.headerSection}>
        <div className={styles.headerTitles}>
          <h1>
            <Target size={32} className={styles.titleIcon} /> Minhas Metas
          </h1>
          <p>Gerencie os seus objetivos financeiros.</p>
        </div>
        <button
          className={styles.newGoalBtn}
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus size={20} /> Nova Meta
        </button>
      </div>

      {/* KPIS */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.green}`}>
            <Wallet />
          </div>
          <div className={styles.statContent}>
            <span>Total Guardado</span>
            <strong>R$ {stats.totalSaved.toLocaleString()}</strong>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.blue}`}>
            <Target />
          </div>
          <div className={styles.statContent}>
            <span>Em Progresso</span>
            <strong>{stats.count - stats.completed}</strong>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.purple}`}>
            <CheckCircle />
          </div>
          <div className={styles.statContent}>
            <span>Concluídas</span>
            <strong>{stats.completed}</strong>
          </div>
        </div>
      </div>

      {/* LISTA DE METAS */}
      <div className={styles.goalsGrid}>
        <AnimatePresence>
          {goals.map((goal) => {
            const progress = Math.min(
              (goal.currentAmount / goal.targetAmount) * 100,
              100
            );
            const isDone = progress >= 100;
            const goalAutomations = automations.filter(
              (a) => a.goalId === goal.id
            );

            return (
              <motion.div
                key={goal.id}
                className={`${styles.goalCard} ${
                  isDone ? styles.completedCard : ""
                }`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                layout
              >
                <div className={styles.cardTop}>
                  <div className={styles.iconBox}>{goal.emoji}</div>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(goal.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <h3 className={styles.cardTitle}>{goal.title}</h3>
                <p className={styles.cardTarget}>
                  Alvo: R$ {Number(goal.targetAmount).toLocaleString()}
                </p>

                <div className={styles.progressSection}>
                  <div className={styles.progressLabels}>
                    <span className={styles.current}>
                      R$ {Number(goal.currentAmount).toLocaleString()}
                    </span>
                    <span className={styles.percentage}>
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {goalAutomations.length > 0 && (
                  <div
                    style={{
                      marginBottom: "12px",
                      padding: "8px",
                      background: "rgba(148, 136, 240, 0.05)",
                      borderRadius: "8px",
                      border: "1px solid rgba(148, 136, 240, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.8rem",
                      color: "#9488f0",
                    }}
                  >
                    <Repeat size={12} />
                    <span>{goalAutomations.length} automação(ões)</span>
                  </div>
                )}

                {isDone ? (
                  <div className={styles.completedBadge}>
                    <CheckCircle size={16} /> Concluída!
                  </div>
                ) : (
                  <button
                    className={styles.addFundsBtn}
                    onClick={() => {
                      setSelectedGoal(goal);
                      setDepositValue("");
                      setIsDepositOpen(true);
                    }}
                  >
                    <Plus size={16} /> Adicionar
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {goals.length === 0 && (
          <div className={styles.emptyState}>
            <Target size={48} opacity={0.3} />
            <p>Nenhuma meta criada ainda.</p>
          </div>
        )}
      </div>

      {/* --- MODAL: CRIAR META --- */}
      <AnimatePresence>
        {isCreateOpen && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCreateOpen(false)}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3>Nova Meta</h3>
                <X
                  className={styles.closeIcon}
                  onClick={() => setIsCreateOpen(false)}
                />
              </div>
              <div className={styles.modalBody}>
                <div className={styles.inputGroup}>
                  <label>Título</label>
                  <input
                    autoFocus
                    placeholder="Ex: Viagem..."
                    value={newGoal.title}
                    onChange={(e) =>
                      setNewGoal({ ...newGoal, title: e.target.value })
                    }
                  />
                </div>
                <div className={styles.rowInputs}>
                  <div className={styles.inputGroup}>
                    <label>Valor Total (R$)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={newGoal.target}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, target: e.target.value })
                      }
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Início (R$)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={newGoal.initial}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, initial: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className={styles.emojiGrid}>
                  {goalEmojis.map((em) => (
                    <div
                      key={em}
                      className={`${styles.emojiItem} ${
                        newGoal.emoji === em ? styles.selected : ""
                      }`}
                      onClick={() => setNewGoal({ ...newGoal, emoji: em })}
                    >
                      {em}
                    </div>
                  ))}
                </div>
                <button className={styles.confirmBtn} onClick={handleCreate}>
                  Criar Meta
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL: DEPOSITAR (LAYOT AMPLO) --- */}
      <AnimatePresence>
        {isDepositOpen && selectedGoal && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isDepositing && setIsDepositOpen(false)}
          >
            <motion.div
              className={`${styles.modalContent} ${styles.depositModalContent}`}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header compacto */}
              <div className={styles.modalHeaderCompact}>
                <div className={styles.modalTitle}>
                  <Coins size={24} color="#9488f0" />
                  <h3>Adicionar Fundos</h3>
                  <div className={styles.goalInfoBadge}>
                    <span>{selectedGoal.emoji}</span>
                    <span>{selectedGoal.title}</span>
                  </div>
                </div>
                <X
                  size={20}
                  className={styles.closeIcon}
                  onClick={() => !isDepositing && setIsDepositOpen(false)}
                  style={
                    isDepositing ? { opacity: 0.5, cursor: "not-allowed" } : {}
                  }
                />
              </div>

              <div className={`${styles.modalBody} ${styles.depositModalBody}`}>
                {/* Layout de uma coluna */}
                <div className={styles.depositSingleColumn}>
                  {/* Input de valor */}
                  <div className={styles.compactAmountInput}>
                    <div className={styles.amountInputHeader}>
                      <label>Valor do depósito</label>
                      {depositValue && (
                        <button
                          onClick={() => setDepositValue("")}
                          className={styles.clearAmountBtn}
                          type="button"
                        >
                          Limpar
                        </button>
                      )}
                    </div>

                    <div className={styles.amountInputMain}>
                      <span className={styles.currencySign}>R$</span>
                      <input
                        type="number"
                        autoFocus
                        placeholder="0"
                        value={depositValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || /^\d*\.?\d*$/.test(val)) {
                            setDepositValue(val);
                          }
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleDeposit()}
                        disabled={isDepositing}
                        className={styles.amountInputField}
                      />
                    </div>

                    <div className={styles.amountInputHint}>
                      Pressione <kbd>Enter</kbd> para confirmar
                    </div>
                  </div>

                  {/* Atalhos rápidos */}
                  <div className={styles.quickAmountsSection}>
                    <div className={styles.sectionTitle}>
                      <span>Atalhos rápidos</span>
                      <button className={styles.viewAllBtn}>Ver mais</button>
                    </div>

                    <div className={styles.quickAmountsGrid}>
                      {[50, 100, 200, 500, 1000, 2000, 5000, 10000].map(
                        (amount) => (
                          <button
                            key={amount}
                            onClick={() => handleQuickAdd(amount)}
                            className={styles.quickAmountItem}
                          >
                            + R$ {amount.toLocaleString()}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Seção de automação */}
                  <div className={styles.automationSectionCompact}>
                    <div className={styles.automationHeader}>
                      <Calendar size={18} />
                      <span>Automatizar este depósito</span>
                    </div>

                    <div className={styles.automationOptionsCompact}>
                      {[
                        {
                          id: "weekly",
                          label: "Toda semana",
                          emoji: "🔄",
                          description: "Toda semana",
                        },
                        {
                          id: "biweekly",
                          label: "Quinzenal",
                          emoji: "📅",
                          description: "A cada 15 dias",
                        },
                        {
                          id: "monthly",
                          label: "Mensal",
                          emoji: "📆",
                          description: "Todo mês",
                        },
                        {
                          id: "yearly",
                          label: "Anual",
                          emoji: "🎉",
                          description: "Todo ano",
                        },
                      ].map((option) => (
                        <div
                          key={option.id}
                          className={styles.automationOptionCompact}
                          onClick={() =>
                            handleAutomationOptionClick(option.id as any)
                          }
                        >
                          <div className={styles.optionEmoji}>
                            {option.emoji}
                          </div>
                          <div className={styles.optionLabelCompact}>
                            {option.label}
                          </div>
                          <div className={styles.optionDescriptionCompact}>
                            {option.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  {Number(depositValue) > 0 && calculateValues && (
                    <div className={styles.previewSectionCompact}>
                      <div className={styles.previewHeader}>
                        <div className={styles.previewTitle}>
                          <TrendingUp size={16} />
                          <span>Impacto na Meta</span>
                        </div>
                        <div className={styles.previewPercentage}>
                          <span className={styles.oldValue}>
                            {calculateValues.currentPercent.toFixed(0)}%
                          </span>
                          <ArrowRight size={12} />
                          <span className={styles.newValue}>
                            {calculateValues.newPercent.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className={styles.compactProgressContainer}>
                        <div className={styles.compactProgressTrack}>
                          <div
                            className={styles.compactProgressBar}
                            style={{
                              width: `${calculateValues.currentPercent}%`,
                            }}
                          />
                          {calculateValues.incrementPercent > 0 && (
                            <div
                              className={styles.compactProgressIncrement}
                              style={{
                                width: `${calculateValues.incrementPercent}%`,
                                left: `${calculateValues.currentPercent}%`,
                              }}
                            />
                          )}
                        </div>
                      </div>

                      <div className={styles.previewStats}>
                        <div className={styles.statItem}>
                          <span className={styles.statLabel}>Novo total</span>
                          <div className={styles.statValue}>
                            R$ {calculateValues.newTotal.toLocaleString()}
                          </div>
                        </div>
                        <div className={styles.statItem}>
                          <span className={styles.statLabel}>
                            {calculateValues.willComplete
                              ? "Concluído!"
                              : "Faltará"}
                          </span>
                          <div
                            className={styles.statValue}
                            style={{
                              color: calculateValues.willComplete
                                ? "#22c55e"
                                : "#fff",
                            }}
                          >
                            {calculateValues.willComplete
                              ? "🎉"
                              : `R$ ${calculateValues.remaining.toLocaleString()}`}
                          </div>
                        </div>
                      </div>

                      {calculateValues.willComplete && (
                        <div className={styles.completionMessage}>
                          <Sparkles size={16} />
                          Meta será concluída! 🎉
                        </div>
                      )}
                    </div>
                  )}

                  {/* Botão de ação principal */}
                  <button
                    className={styles.primaryActionBtnLarge}
                    onClick={handleDeposit}
                    disabled={
                      !depositValue || Number(depositValue) <= 0 || isDepositing
                    }
                  >
                    {isDepositing ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          style={{
                            width: "20px",
                            height: "20px",
                            border: "2px solid white",
                            borderTopColor: "transparent",
                            borderRadius: "50%",
                            marginRight: "8px",
                          }}
                        />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Coins size={20} />
                        Confirmar Depósito
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL: AGENDAR DEPÓSITO --- */}
      <AnimatePresence>
        {isScheduleOpen && selectedGoal && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isScheduling && setIsScheduleOpen(false)}
          >
            <motion.div
              className={`${styles.modalContent} ${styles.scheduleModalContent}`}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3>
                  <Calendar size={20} style={{ marginRight: "8px" }} />
                  Agendar Depósito Automático
                </h3>
                <X
                  className={styles.closeIcon}
                  onClick={() => !isScheduling && setIsScheduleOpen(false)}
                />
              </div>

              <div className={styles.modalBody}>
                <div className={styles.scheduleForm}>
                  <div className={styles.inputGroup}>
                    <label>Valor do depósito</label>
                    <div className={styles.compactAmountInput}>
                      <div className={styles.amountInputMain}>
                        <span className={styles.currencySign}>R$</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={scheduleForm.amount}
                          onChange={(e) =>
                            setScheduleForm({
                              ...scheduleForm,
                              amount: e.target.value,
                            })
                          }
                          className={styles.amountInputField}
                          style={{ fontSize: "2rem" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.inputGroup}>
                      <label>Frequência</label>
                      <div className={styles.frequencyGrid}>
                        {[
                          { id: "weekly", label: "Semanal" },
                          { id: "biweekly", label: "Quinzenal" },
                          { id: "monthly", label: "Mensal" },
                          { id: "yearly", label: "Anual" },
                        ].map((option) => (
                          <div
                            key={option.id}
                            className={`${styles.frequencyOption} ${
                              scheduleForm.frequency === option.id
                                ? styles.selected
                                : ""
                            }`}
                            onClick={() =>
                              setScheduleForm({
                                ...scheduleForm,
                                frequency: option.id as any,
                              })
                            }
                          >
                            {option.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Data de início</label>
                      <input
                        type="date"
                        value={scheduleForm.startDate}
                        onChange={(e) =>
                          setScheduleForm({
                            ...scheduleForm,
                            startDate: e.target.value,
                          })
                        }
                        className={styles.dateInput}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>

                  <div className={styles.schedulePreview}>
                    <h4
                      style={{
                        color: "#fff",
                        marginBottom: "8px",
                        fontSize: "1rem",
                      }}
                    >
                      Resumo do Agendamento
                    </h4>
                    <p
                      style={{
                        color: "#a1a1aa",
                        fontSize: "0.9rem",
                        margin: 0,
                      }}
                    >
                      <strong>
                        R$ {Number(scheduleForm.amount || 0).toLocaleString()}
                      </strong>{" "}
                      serão adicionados automaticamente à meta{" "}
                      <strong>{selectedGoal.title}</strong>{" "}
                      {scheduleForm.frequency === "weekly"
                        ? "toda semana"
                        : scheduleForm.frequency === "biweekly"
                        ? "a cada 15 dias"
                        : scheduleForm.frequency === "monthly"
                        ? "todo mês"
                        : "todo ano"}
                      .
                    </p>
                  </div>

                  <div className={styles.scheduleActions}>
                    <button
                      className={styles.cancelScheduleBtn}
                      onClick={() => setIsScheduleOpen(false)}
                      disabled={isScheduling}
                    >
                      Cancelar
                    </button>
                    <button
                      className={styles.confirmScheduleBtn}
                      onClick={handleCreateAutomation}
                      disabled={
                        !scheduleForm.amount ||
                        Number(scheduleForm.amount) <= 0 ||
                        isScheduling
                      }
                    >
                      {isScheduling ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            style={{
                              width: "16px",
                              height: "16px",
                              border: "2px solid white",
                              borderTopColor: "transparent",
                              borderRadius: "50%",
                              marginRight: "8px",
                            }}
                          />
                          Criando...
                        </>
                      ) : (
                        "Criar Automação"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
