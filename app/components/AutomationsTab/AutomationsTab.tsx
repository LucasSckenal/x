"use client";

import { useState, useEffect } from "react";
import { db, auth } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  deleteDoc,
  doc,
  updateDoc,
  orderBy,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Repeat,
  Trash2,
  Zap,
  X,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Edit3,
  Save,
  CalendarDays,
  DollarSign,
} from "lucide-react";
import toast from "react-hot-toast";
import styles from "../Goals/Goals.module.scss";

interface Automation {
  id: string;
  goalId: string;
  goalTitle: string;
  goalEmoji: string;
  amount: number;
  frequency: "daily" | "weekly" | "biweekly" | "monthly" | "yearly";
  nextExecution: string;
  active: boolean;
  createdAt: any;
}

interface Goal {
  id: string;
  title: string;
  emoji: string;
}

export default function AutomationsTab() {
  const [user, setUser] = useState<User | null>(null);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para modais
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(
    null
  );
  const [editForm, setEditForm] = useState({
    amount: "",
    nextExecution: "",
    frequency: "monthly" as
      | "daily"
      | "weekly"
      | "biweekly"
      | "monthly"
      | "yearly",
  });

  // Buscar usuário
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  // Buscar metas para obter títulos
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/goals`));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        emoji: doc.data().emoji,
      })) as Goal[];
      setGoals(data);
    });
    return () => unsub();
  }, [user]);

  // Buscar automações
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, `users/${user.uid}/automations`),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const automationData = doc.data();
        const goal = goals.find((g) => g.id === automationData.goalId);

        return {
          id: doc.id,
          ...automationData,
          goalTitle: goal?.title || "Meta não encontrada",
          goalEmoji: goal?.emoji || "🎯",
        } as Automation;
      });

      setAutomations(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user, goals]);

  // Função para calcular próxima execução baseada na frequência
  const calculateNextExecution = (
    frequency: "daily" | "weekly" | "biweekly" | "monthly" | "yearly",
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

  // Iniciar edição
  const handleStartEdit = (automation: Automation) => {
    setEditingAutomation(automation);
    setEditForm({
      amount: automation.amount.toString(),
      nextExecution: automation.nextExecution.split("T")[0],
      frequency: automation.frequency,
    });
  };

  // Salvar edição
  const handleSaveEdit = async () => {
    if (!user || !editingAutomation) return;

    try {
      // Validar dados
      if (!editForm.amount || Number(editForm.amount) <= 0) {
        toast.error("Digite um valor válido");
        return;
      }

      if (!editForm.nextExecution) {
        toast.error("Selecione uma data válida");
        return;
      }

      // Calcular nova próxima execução
      const newNextExecution = calculateNextExecution(
        editForm.frequency,
        editForm.nextExecution
      );

      // Atualizar no Firebase
      await updateDoc(
        doc(db, `users/${user.uid}/automations`, editingAutomation.id),
        {
          amount: Number(editForm.amount),
          frequency: editForm.frequency,
          nextExecution: newNextExecution,
          updatedAt: new Date().toISOString(),
        }
      );

      toast.success("Automação atualizada com sucesso!");
      setEditingAutomation(null);
      setEditForm({ amount: "", nextExecution: "", frequency: "monthly" });
    } catch (error) {
      toast.error("Erro ao atualizar automação");
    }
  };

  const handleToggleAutomation = async (id: string, currentActive: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/automations`, id), {
        active: !currentActive,
      });
      toast.success(
        `Automação ${currentActive ? "desativada" : "ativada"} com sucesso!`
      );
    } catch (error) {
      toast.error("Erro ao atualizar automação");
    }
  };

  const handleDeleteAutomation = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/automations`, id));
      toast.success("Automação excluída!");
      setDeleteConfirm(null);
    } catch (error) {
      toast.error("Erro ao excluir automação");
    }
  };

  const formatFrequency = (frequency: string) => {
    const map: Record<string, string> = {
      daily: "Diária",
      weekly: "Semanal",
      biweekly: "Quinzenal",
      monthly: "Mensal",
      yearly: "Anual",
    };
    return map[frequency] || frequency;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getNextExecutionText = (nextExecution: string) => {
    const today = new Date();
    const nextDate = new Date(nextExecution);
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Amanhã";
    if (diffDays < 7) return `Em ${diffDays} dias`;
    if (diffDays < 30) return `Em ${Math.floor(diffDays / 7)} semanas`;
    return `Em ${Math.floor(diffDays / 30)} meses`;
  };

  return (
    <div className={styles.pageContainer}>
      {/* Header da seção de automações */}
      <div className={styles.headerSection}>
        <div className={styles.headerTitles}>
          <h1>
            <Repeat size={32} className={styles.titleIcon} /> Automações
          </h1>
          <p>Gerencie seus depósitos automáticos e agendamentos.</p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.green}`}>
            <Zap />
          </div>
          <div className={styles.statContent}>
            <span>Total de Automações</span>
            <strong>{automations.length}</strong>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.blue}`}>
            <Play />
          </div>
          <div className={styles.statContent}>
            <span>Ativas</span>
            <strong>{automations.filter((a) => a.active).length}</strong>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.purple}`}>
            <Calendar />
          </div>
          <div className={styles.statContent}>
            <span>Próximos 7 dias</span>
            <strong>
              {
                automations.filter((a) => {
                  const nextDate = new Date(a.nextExecution);
                  const today = new Date();
                  const diffTime = nextDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return diffDays <= 7 && diffDays >= 0;
                }).length
              }
            </strong>
          </div>
        </div>
      </div>

      {/* Modal de Edição */}
      <AnimatePresence>
        {editingAutomation && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingAutomation(null)}
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
                  <Edit3 size={20} style={{ marginRight: "8px" }} />
                  Editar Automação
                </h3>
                <X
                  className={styles.closeIcon}
                  onClick={() => setEditingAutomation(null)}
                />
              </div>

              <div className={styles.modalBody}>
                <div className={styles.scheduleForm}>
                  {/* Info da Meta */}
                  <div className={styles.inputGroup}>
                    <label>Meta</label>
                    <div
                      style={{
                        padding: "12px",
                        background: "rgba(148, 136, 240, 0.1)",
                        borderRadius: "10px",
                        border: "1px solid rgba(148, 136, 240, 0.2)",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "20px",
                          background: "rgba(255, 255, 255, 0.05)",
                          borderRadius: "8px",
                        }}
                      >
                        {editingAutomation.goalEmoji}
                      </div>
                      <span style={{ color: "#fff", fontWeight: "500" }}>
                        {editingAutomation.goalTitle}
                      </span>
                    </div>
                  </div>

                  {/* Valor */}
                  <div className={styles.inputGroup}>
                    <label>Valor do depósito</label>
                    <div className={styles.compactAmountInput}>
                      <div className={styles.amountInputMain}>
                        <span className={styles.currencySign}>R$</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={editForm.amount}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              amount: e.target.value,
                            })
                          }
                          className={styles.amountInputField}
                          style={{ fontSize: "2rem" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Frequência e Data */}
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
                              editForm.frequency === option.id
                                ? styles.selected
                                : ""
                            }`}
                            onClick={() =>
                              setEditForm({
                                ...editForm,
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
                      <label>Próxima execução</label>
                      <input
                        type="date"
                        value={editForm.nextExecution}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            nextExecution: e.target.value,
                          })
                        }
                        className={styles.dateInput}
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  <div className={styles.schedulePreview}>
                    <h4
                      style={{
                        color: "#fff",
                        marginBottom: "8px",
                        fontSize: "1rem",
                      }}
                    >
                      Resumo da Automação
                    </h4>
                    <p
                      style={{
                        color: "#a1a1aa",
                        fontSize: "0.9rem",
                        margin: 0,
                      }}
                    >
                      <strong>
                        R$ {Number(editForm.amount || 0).toLocaleString()}
                      </strong>{" "}
                      serão adicionados automaticamente à meta{" "}
                      <strong>{editingAutomation.goalTitle}</strong>{" "}
                      {editForm.frequency === "weekly"
                        ? "toda semana"
                        : editForm.frequency === "biweekly"
                        ? "a cada 15 dias"
                        : editForm.frequency === "monthly"
                        ? "todo mês"
                        : "todo ano"}
                      , começando em{" "}
                      <strong>{formatDate(editForm.nextExecution)}</strong>.
                    </p>
                  </div>

                  {/* Ações */}
                  <div className={styles.scheduleActions}>
                    <button
                      className={styles.cancelScheduleBtn}
                      onClick={() => setEditingAutomation(null)}
                    >
                      Cancelar
                    </button>
                    <button
                      className={styles.confirmScheduleBtn}
                      onClick={handleSaveEdit}
                      disabled={!editForm.amount || !editForm.nextExecution}
                    >
                      <Save size={16} style={{ marginRight: "8px" }} />
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de automações */}
      {loading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px",
            color: "#a1a1aa",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "3px solid rgba(255, 255, 255, 0.1)",
              borderTopColor: "#9488f0",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: "16px",
            }}
          />
          <p>Carregando automações...</p>
        </div>
      ) : automations.length === 0 ? (
        <div className={styles.emptyState}>
          <Repeat size={48} opacity={0.3} />
          <h3 style={{ color: "#fff", marginBottom: "8px" }}>
            Nenhuma automação criada
          </h3>
          <p>Crie automações nas suas metas para vê-las aqui.</p>
        </div>
      ) : (
        <div className={styles.goalsGrid}>
          <AnimatePresence>
            {automations.map((automation) => (
              <motion.div
                key={automation.id}
                className={`${styles.goalCard} ${
                  !automation.active ? styles.inactiveCard : ""
                }`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                layout
              >
                <div className={styles.cardTop}>
                  <div className={styles.iconBox}>{automation.goalEmoji}</div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {/* Botão Editar */}
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleStartEdit(automation)}
                      title="Editar automação"
                      style={{ color: "#52525b" }}
                    >
                      <Edit3 size={18} />
                    </button>

                    {/* Botão Ativar/Desativar ou Excluir */}
                    <button
                      className={styles.deleteBtn}
                      onClick={() =>
                        automation.active
                          ? handleToggleAutomation(
                              automation.id,
                              automation.active
                            )
                          : setDeleteConfirm(automation.id)
                      }
                      title={
                        automation.active
                          ? "Pausar automação"
                          : "Excluir automação"
                      }
                    >
                      {automation.active ? (
                        <Pause size={18} />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <h3 className={styles.cardTitle}>{automation.goalTitle}</h3>
                <p className={styles.cardTarget}>
                  Valor: R$ {automation.amount.toLocaleString()}
                </p>

                {/* Detalhes da Automação */}
                <div
                  style={{
                    marginBottom: "16px",
                    padding: "12px",
                    background: automation.active
                      ? "rgba(34, 197, 94, 0.1)"
                      : "rgba(239, 68, 68, 0.1)",
                    borderRadius: "12px",
                    border: `1px solid ${
                      automation.active
                        ? "rgba(34, 197, 94, 0.2)"
                        : "rgba(239, 68, 68, 0.2)"
                    }`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: automation.active ? "#22c55e" : "#ef4444",
                      marginBottom: "8px",
                      fontSize: "0.9rem",
                    }}
                  >
                    <Repeat size={14} />
                    <span>{formatFrequency(automation.frequency)}</span>
                    <div
                      style={{
                        marginLeft: "auto",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: automation.active ? "#22c55e" : "#ef4444",
                        }}
                      />
                      <span>{automation.active ? "Ativa" : "Inativa"}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "16px",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div>
                      <div style={{ marginBottom: "4px", color: "#a1a1aa" }}>
                        Valor
                      </div>
                      <div
                        style={{
                          color: "#fff",
                          fontWeight: "500",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <DollarSign size={12} />
                        R$ {automation.amount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ marginBottom: "4px", color: "#a1a1aa" }}>
                        Próxima execução
                      </div>
                      <div
                        style={{
                          color: "#fff",
                          fontWeight: "500",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <CalendarDays size={12} />
                        {formatDate(automation.nextExecution)}
                      </div>
                    </div>
                    <div>
                      <div style={{ marginBottom: "4px", color: "#a1a1aa" }}>
                        Em
                      </div>
                      <div style={{ color: "#fff", fontWeight: "500" }}>
                        {getNextExecutionText(automation.nextExecution)}
                      </div>
                    </div>
                    <div>
                      <div style={{ marginBottom: "4px", color: "#a1a1aa" }}>
                        Status
                      </div>
                      <div style={{ color: "#fff", fontWeight: "500" }}>
                        {automation.active ? "🟢 Ativa" : "🔴 Inativa"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botões de ação */}
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginTop: "auto",
                  }}
                >
                  <button
                    onClick={() => handleStartEdit(automation)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "12px",
                      background: "rgba(148, 136, 240, 0.1)",
                      border: "1px solid rgba(148, 136, 240, 0.2)",
                      color: "#9488f0",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(148, 136, 240, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "rgba(148, 136, 240, 0.1)";
                    }}
                  >
                    <Edit3 size={16} />
                    Editar
                  </button>
                  <button
                    onClick={() =>
                      handleToggleAutomation(automation.id, automation.active)
                    }
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "12px",
                      background: automation.active
                        ? "rgba(239, 68, 68, 0.1)"
                        : "rgba(34, 197, 94, 0.1)",
                      border: `1px solid ${
                        automation.active
                          ? "rgba(239, 68, 68, 0.2)"
                          : "rgba(34, 197, 94, 0.2)"
                      }`,
                      color: automation.active ? "#ef4444" : "#22c55e",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = automation.active
                        ? "rgba(239, 68, 68, 0.2)"
                        : "rgba(34, 197, 94, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = automation.active
                        ? "rgba(239, 68, 68, 0.1)"
                        : "rgba(34, 197, 94, 0.1)";
                    }}
                  >
                    {automation.active ? (
                      <>
                        <Pause size={16} />
                        Pausar
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                        Ativar
                      </>
                    )}
                  </button>
                </div>

                {/* Confirmação de exclusão */}
                <AnimatePresence>
                  {deleteConfirm === automation.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        marginTop: "16px",
                        padding: "16px",
                        background: "rgba(239, 68, 68, 0.05)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        borderRadius: "12px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          color: "#ef4444",
                          marginBottom: "12px",
                        }}
                      >
                        <AlertCircle size={16} />
                        <span style={{ fontSize: "0.9rem" }}>
                          Tem certeza que deseja excluir esta automação?
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                        }}
                      >
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          style={{
                            flex: 1,
                            padding: "8px",
                            borderRadius: "8px",
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            color: "#a1a1aa",
                            cursor: "pointer",
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleDeleteAutomation(automation.id)}
                          style={{
                            flex: 1,
                            padding: "8px",
                            borderRadius: "8px",
                            background: "#ef4444",
                            color: "white",
                            border: "none",
                            cursor: "pointer",
                            fontWeight: "600",
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Adicione este estilo no global ou inline */}
      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
