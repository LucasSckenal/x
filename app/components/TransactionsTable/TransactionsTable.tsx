"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import Modal from "../Modal/Modal";
import CustomSelect from "../CustomSelect/CustomSelect";
import styles from "./TransactionsTable.module.scss";

// --- Interfaces ---
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  categoryIcon: string;
  date: string;
  recurring?: boolean;
  recurringFrequency?: "weekly" | "monthly" | "yearly";
  recurringEndDate?: string;
  recurringId?: string | null;
  isProjection?: boolean;
}

export const transactionCategories = [
  { value: "Alimentação", label: "Alimentação", icon: "🍕" },
  { value: "Transporte", label: "Transporte", icon: "🚗" },
  { value: "Compras", label: "Compras", icon: "🛍️" },
  { value: "Entretenimento", label: "Entretenimento", icon: "🎬" },
  { value: "Saúde", label: "Saúde", icon: "🏥" },
  { value: "Educação", label: "Educação", icon: "📚" },
  { value: "Salário", label: "Salário", icon: "💰" },
  { value: "Investimentos", label: "Investimentos", icon: "📈" },
  { value: "Outros", label: "Outros", icon: "📦" },
  { value: "Moradia", label: "Moradia", icon: "🏠" },
];

const frequencyOptions = [
  { value: "weekly", label: "Semanal", icon: "🔄" },
  { value: "monthly", label: "Mensal", icon: "📅" },
  { value: "yearly", label: "Anual", icon: "🎉" },
];

// --- Funções Auxiliares de Data ---
const parseSafeDate = (dateStr: string) => {
  if (!dateStr) return new Date(NaN);
  // Adiciona T00:00:00 para evitar problemas de fuso horário
  const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
  return d;
};

const formatToISO = (date: Date) => {
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

export default function TransactionsTable({
  transactions,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
}: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [editScope, setEditScope] = useState<"single" | "series">("single");

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    type: "expense" as "income" | "expense",
    category: "Outros",
    categoryIcon: "💰",
    date: formatToISO(new Date()),
    recurring: false,
    frequency: "monthly" as any,
    endDate: "",
  });

  // --- Lógica de Projeção Blindada ---
  const filteredAndSortedTransactions = useMemo(() => {
    const expanded: Transaction[] = [];
    const endOfYear = new Date(new Date().getFullYear(), 11, 31);

    transactions.forEach((t: Transaction) => {
      expanded.push(t);

      if (t.recurring && t.recurringFrequency && t.date) {
        let current = parseSafeDate(t.date);
        if (isNaN(current.getTime())) return;

        const limitDateStr = t.recurringEndDate || "";
        const limitDate = limitDateStr
          ? parseSafeDate(limitDateStr)
          : endOfYear;
        const finalLimit =
          isNaN(limitDate.getTime()) || limitDate > endOfYear
            ? endOfYear
            : limitDate;

        let safetyCounter = 0;
        while (safetyCounter < 50) {
          // Proteção contra loop infinito
          safetyCounter++;

          if (t.recurringFrequency === "weekly")
            current.setDate(current.getDate() + 7);
          else if (t.recurringFrequency === "monthly")
            current.setMonth(current.getMonth() + 1);
          else if (t.recurringFrequency === "yearly")
            current.setFullYear(current.getFullYear() + 1);

          if (isNaN(current.getTime()) || current > finalLimit) break;

          expanded.push({
            ...t,
            id: `${t.id}-proj-${current.getTime()}`,
            date: formatToISO(current),
            isProjection: true,
          });
        }
      }
    });

    return expanded
      .filter((t) => {
        const matchesSearch = t.description
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const matchesType = filter === "all" || t.type === filter;
        const tDate = parseSafeDate(t.date);
        const matchesMonth =
          monthFilter === "all" ||
          (!isNaN(tDate.getTime()) &&
            tDate.getMonth().toString() === monthFilter);
        return matchesSearch && matchesType && matchesMonth;
      })
      .sort(
        (a, b) =>
          parseSafeDate(b.date).getTime() - parseSafeDate(a.date).getTime()
      );
  }, [transactions, searchTerm, filter, monthFilter]);

  const transactionsByMonth = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredAndSortedTransactions.forEach((t) => {
      const date = parseSafeDate(t.date);
      if (isNaN(date.getTime())) return;
      const monthYear = date.toLocaleDateString("pt-BR", {
        year: "numeric",
        month: "long",
      });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(t);
    });
    return groups;
  }, [filteredAndSortedTransactions]);

  // --- Handlers ---
  const handleEditClick = (t: Transaction) => {
    setSelectedTransaction(t);
    setEditScope("single");
    setFormData({
      description: t.description,
      amount: Math.abs(t.amount).toString(),
      type: t.type,
      category: t.category,
      categoryIcon: t.categoryIcon,
      date: t.date,
      recurring: t.recurring || false,
      frequency: t.recurringFrequency || "monthly",
      endDate: t.recurringEndDate || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    const data = {
      ...formData,
      amount: parseFloat(formData.amount) || 0,
      scope: editScope,
      recurringFrequency: formData.frequency,
      recurringEndDate: formData.endDate || null,
    };

    if (selectedTransaction?.isProjection) {
      onAddTransaction({ ...data, isProjection: false });
    } else if (selectedTransaction) {
      onEditTransaction(selectedTransaction.id, data);
    } else {
      onAddTransaction(data);
    }
    setIsModalOpen(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Transações</h3>
        <div className={styles.controls}>
          <div className={styles.searchBox}>
            <Search size={18} />
            <input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className={styles.addButton}
            onClick={() => {
              setSelectedTransaction(null);
              setIsModalOpen(true);
            }}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <div>Descrição</div>
          <div>Categoria</div>
          <div>Data</div>
          <div>Valor</div>
          <div>Ações</div>
        </div>

        {Object.entries(transactionsByMonth).map(([month, items]) => (
          <div key={month}>
            <div className={styles.monthHeader}>{month}</div>
            {items.map((t) => (
              <div
                key={t.id}
                className={`${styles.tableRow} ${
                  t.isProjection ? styles.projectionRow : ""
                }`}
              >
                <div className={styles.cell}>
                  <div className={styles.cellDescription}>
                    <span className={styles.categoryIcon}>
                      {t.categoryIcon}
                    </span>
                    <div>
                      <div>
                        {t.description}{" "}
                        {t.isProjection && (
                          <small style={{ opacity: 0.6 }}>(Previsto)</small>
                        )}
                      </div>
                      {t.recurring && (
                        <div className={styles.recurringBadge}>
                          <Calendar size={12} /> Recorrente
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles.cell}>{t.category}</div>
                <div className={styles.cell}>
                  {parseSafeDate(t.date).toLocaleDateString("pt-BR")}
                </div>
                <div className={`${styles.cell} ${styles.cellAmount}`}>
                  <span
                    className={
                      t.type === "income" ? styles.income : styles.expense
                    }
                  >
                    {t.type === "income" ? "+" : "-"} R${" "}
                    {Math.abs(t.amount).toFixed(2)}
                  </span>
                </div>
                <div className={styles.cellActions}>
                  <div className={styles.actionButtons}>
                    <button onClick={() => handleEditClick(t)}>
                      <Edit size={16} />
                    </button>
                    {!t.isProjection && (
                      <button
                        onClick={() => {
                          setSelectedTransaction(t);
                          setIsDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Modal Principal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedTransaction ? "Editar" : "Novo"}
      >
        <div className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label>Descrição</label>
            <input
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Valor</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
              />
            </div>
            <div className={styles.formGroup}>
              <label>Data</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Categoria</label>
            <CustomSelect
              options={transactionCategories}
              value={formData.category}
              onChange={(v) =>
                setFormData({
                  ...formData,
                  category: v,
                  categoryIcon:
                    transactionCategories.find((c) => c.value === v)?.icon ||
                    "💰",
                })
              }
            />
          </div>

          <div className={styles.recurringSection}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.recurring}
                onChange={(e) =>
                  setFormData({ ...formData, recurring: e.target.checked })
                }
              />
              Recorrente
            </label>
            {formData.recurring && (
              <div className={styles.recurringFields}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Frequência</label>
                    <CustomSelect
                      options={frequencyOptions}
                      value={formData.frequency}
                      onChange={(v) =>
                        setFormData({ ...formData, frequency: v as any })
                      }
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Até quando?</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {(selectedTransaction?.recurring ||
            selectedTransaction?.isProjection) && (
            <div
              style={{
                background: "rgba(var(--accent-rgb), 0.05)",
                padding: "15px",
                borderRadius: "8px",
                marginTop: "10px",
              }}
            >
              <p
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                }}
              >
                Aplicar em:
              </p>
              <div style={{ display: "flex", gap: "15px" }}>
                <label style={{ fontSize: "13px" }}>
                  <input
                    type="radio"
                    checked={editScope === "single"}
                    onChange={() => setEditScope("single")}
                  />{" "}
                  Só esta
                </label>
                <label style={{ fontSize: "13px" }}>
                  <input
                    type="radio"
                    checked={editScope === "series"}
                    onChange={() => setEditScope("series")}
                  />{" "}
                  Toda a série
                </label>
              </div>
            </div>
          )}

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.saveButton}
              onClick={handleSave}
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Deletar */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir"
      >
        <div style={{ padding: "20px", textAlign: "center" }}>
          <AlertCircle
            size={40}
            color="#ff4444"
            style={{ marginBottom: "10px" }}
          />
          <p>
            Excluir <strong>{selectedTransaction?.description}</strong>?
          </p>
          {selectedTransaction?.recurring && (
            <div
              style={{
                marginTop: "15px",
                textAlign: "left",
                background: "rgba(0,0,0,0.03)",
                padding: "10px",
              }}
            >
              <label style={{ display: "block", marginBottom: "5px" }}>
                <input
                  type="radio"
                  checked={editScope === "single"}
                  onChange={() => setEditScope("single")}
                />{" "}
                Só esta
              </label>
              <label>
                <input
                  type="radio"
                  checked={editScope === "series"}
                  onChange={() => setEditScope("series")}
                />{" "}
                Toda a série
              </label>
            </div>
          )}
          <div className={styles.modalActions} style={{ marginTop: "20px" }}>
            <button
              className={styles.cancelButton}
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              className={styles.deleteConfirmButton}
              style={{ background: "#ff4444", color: "white" }}
              onClick={() => {
                onDeleteTransaction(selectedTransaction!.id, editScope);
                setIsDeleteModalOpen(false);
              }}
            >
              Excluir
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
