"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import Modal from "../Modal/Modal";
import CustomSelect from "../CustomSelect/CustomSelect";
import styles from "./TransactionsTable.module.scss";

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

// --- ATUALIZADO COM "CARTÃO DE CRÉDITO" ---
export const transactionCategories = [
  { value: "Alimentação", label: "Alimentação", icon: "🍕" },
  { value: "Transporte", label: "Transporte", icon: "🚗" },
  { value: "Compras", label: "Compras", icon: "🛍️" },
  { value: "Cartão de Crédito", label: "Cartão de Crédito", icon: "💳" }, // <--- NOVO
  { value: "Entretenimento", label: "Entretenimento", icon: "🎬" },
  { value: "Saúde", label: "Saúde", icon: "🏥" },
  { value: "Educação", label: "Educação", icon: "📚" },
  { value: "Salário", label: "Salário", icon: "💰" },
  { value: "Investimentos", label: "Investimentos", icon: "📈" },
  { value: "Moradia", label: "Moradia", icon: "🏠" },
  { value: "Outros", label: "Outros", icon: "📦" },
];

const frequencyOptions = [
  { value: "weekly", label: "Semanal", icon: "🔄" },
  { value: "monthly", label: "Mensal", icon: "📅" },
  { value: "yearly", label: "Anual", icon: "🎉" },
];

const parseSafeDate = (dateStr: string) => {
  if (!dateStr) return new Date(NaN);
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [editScope, setEditScope] = useState<"single" | "series">("single");

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    type: "expense" as "income" | "expense",
    category: "Outros",
    categoryIcon: "📦",
    date: formatToISO(new Date()),
    recurring: false,
    frequency: "monthly" as any,
    endDate: "",
  });

  const openDatePicker = () => {
    setPickerYear(currentDate.getFullYear());
    setIsDateModalOpen(true);
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(pickerYear);
    newDate.setMonth(monthIndex);
    setCurrentDate(newDate);
    setIsDateModalOpen(false);
  };

  const formatMonthDisplay = (date: Date) => {
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  const filteredAndSortedTransactions = useMemo(() => {
    const expanded: Transaction[] = [];
    const viewYear = currentDate.getFullYear();
    const endOfYear = new Date(viewYear, 11, 31);

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
          !limitDateStr || limitDate > endOfYear ? endOfYear : limitDate;

        let safetyCounter = 0;

        while (safetyCounter < 60) {
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
          !isNaN(tDate.getTime()) &&
          tDate.getMonth() === currentDate.getMonth() &&
          tDate.getFullYear() === currentDate.getFullYear();

        return matchesSearch && matchesType && matchesMonth;
      })
      .sort(
        (a, b) =>
          parseSafeDate(b.date).getTime() - parseSafeDate(a.date).getTime()
      );
  }, [transactions, searchTerm, filter, currentDate]);

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
      recurringFrequency: formData.frequency,
      recurringEndDate: formData.endDate || null,
    };

    if (selectedTransaction?.isProjection) {
      // Proteção caso onAddTransaction não seja passado (embora agora deva ser)
      if (onAddTransaction) onAddTransaction({ ...data, isProjection: false });
    } else if (selectedTransaction) {
      if (onEditTransaction) onEditTransaction(selectedTransaction.id, data);
    } else {
      if (onAddTransaction) onAddTransaction(data);
    }
    setIsModalOpen(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Transações</h3>

        <button className={styles.dateTriggerBtn} onClick={openDatePicker}>
          <Calendar size={18} />
          <span>{formatMonthDisplay(currentDate)}</span>
        </button>

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
              setFormData({
                ...formData,
                description: "",
                amount: "",
                date: formatToISO(new Date()),
              });
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

        {filteredAndSortedTransactions.length > 0 ? (
          filteredAndSortedTransactions.map((t) => (
            <div
              key={t.id}
              className={`${styles.tableRow} ${
                t.isProjection ? styles.projectionRow : ""
              }`}
            >
              <div className={styles.cell}>
                <div className={styles.cellDescription}>
                  <span className={styles.categoryIcon}>{t.categoryIcon}</span>
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {t.description}
                      {t.isProjection && (
                        <span className={styles.tagProj}>Previsto</span>
                      )}
                    </div>
                    {t.recurring && !t.isProjection && (
                      <div className={styles.recurringBadge}>
                        <Calendar size={12} /> Recorrente
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.cell}>{t.category}</div>
              <div className={styles.cell}>
                {parseSafeDate(t.date).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })}
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
                  <button
                    onClick={() => handleEditClick(t)}
                    title={t.isProjection ? "Confirmar Pagamento" : "Editar"}
                  >
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
          ))
        ) : (
          <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
            Nenhuma transação encontrada em{" "}
            <strong>{formatMonthDisplay(currentDate)}</strong>.
          </div>
        )}
      </div>

      <Modal
        isOpen={isDateModalOpen}
        onClose={() => setIsDateModalOpen(false)}
        title="Selecionar Período"
      >
        <div className={styles.datePickerContent}>
          <div className={styles.yearSelector}>
            <button onClick={() => setPickerYear((prev) => prev - 1)}>
              <ChevronLeft size={24} />
            </button>
            <span>{pickerYear}</span>
            <button onClick={() => setPickerYear((prev) => prev + 1)}>
              <ChevronRight size={24} />
            </button>
          </div>

          <div className={styles.monthsGrid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <button
                key={i}
                className={`${styles.monthBtn} ${
                  currentDate.getMonth() === i &&
                  currentDate.getFullYear() === pickerYear
                    ? styles.active
                    : ""
                }`}
                onClick={() => handleMonthSelect(i)}
              >
                {new Date(0, i)
                  .toLocaleDateString("pt-BR", { month: "short" })
                  .replace(".", "")}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          selectedTransaction?.isProjection
            ? "Confirmar Transação"
            : selectedTransaction
            ? "Editar"
            : "Nova Transação"
        }
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
                    <label>Data Final (Opcional)</label>
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
            (selectedTransaction?.isProjection && formData.recurring)) && (
            <div className={styles.scopeBox}>
              <p>Aplicar alteração em:</p>
              <div className={styles.radios}>
                <label>
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
            </div>
          )}

          <div className={styles.modalActions}>
            <button className={styles.saveButton} onClick={handleSave}>
              Salvar
            </button>
          </div>
        </div>
      </Modal>

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
              className={styles.scopeBox}
              style={{ marginTop: "15px", textAlign: "left" }}
            >
              <div className={styles.radios}>
                <label>
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
              onClick={() => {
                if (onDeleteTransaction)
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
