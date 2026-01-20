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
  ChevronDown,
  CreditCard,
  RefreshCw,
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
  cardId?: string;
  recurring?: boolean;
  recurringFrequency?: "weekly" | "monthly" | "yearly";
  recurringEndDate?: string;
  isProjection?: boolean;
}

export const transactionCategories = [
  { value: "Alimentação", label: "Alimentação", icon: "🍕" },
  { value: "Transporte", label: "Transporte", icon: "🚗" },
  { value: "Compras", label: "Compras", icon: "🛍️" },
  { value: "Cartão de Crédito", label: "Cartão de Crédito", icon: "💳" },
  { value: "Entretenimento", label: "Entretenimento", icon: "🎬" },
  { value: "Saúde", label: "Saúde", icon: "💊" },
  { value: "Educação", label: "Educação", icon: "📚" },
  { value: "Salário", label: "Salário", icon: "💰" },
  { value: "Investimento", label: "Investimento", icon: "📈" },
  { value: "Outro", label: "Outro", icon: "📝" },
];

interface TransactionsTableProps {
  transactions: Transaction[];
  cards?: any[];
  onAddTransaction: (data: any) => void;
  onEditTransaction: (id: string, data: any, scope?: string) => void;
  onDeleteTransaction: (id: string, scope?: string) => void;
}

export default function TransactionsTable({
  transactions,
  cards = [],
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
}: TransactionsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Filtros de Data
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  // Form
  const [formData, setFormData] = useState<Partial<Transaction>>({
    description: "",
    amount: 0,
    type: "expense",
    category: "Outro",
    categoryIcon: "📝",
    date: new Date().toISOString().split("T")[0],
    recurring: false,
    recurringFrequency: "monthly",
    recurringEndDate: "",
    cardId: "",
  });

  // --- FUNÇÃO CORRETORA DE DATA ---
  // Transforma 2023-10-25 em 25/10/2023 sem passar pelo objeto Date (evita fuso horário)
  const formatDateNoTimezone = (dateString: string) => {
    if (!dateString) return "--/--/----";
    // Pega só a parte da data, ignorando hora se houver (T...)
    const cleanDate = dateString.split("T")[0];
    const parts = cleanDate.split("-");
    // Se não tiver 3 partes (ano-mes-dia), retorna original
    if (parts.length !== 3) return dateString;

    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  const openCreateModal = () => {
    setSelectedTransaction(null);
    setFormData({
      description: "",
      amount: 0,
      type: "expense",
      category: "Outro",
      categoryIcon: "📝",
      date: new Date().toISOString().split("T")[0],
      recurring: false,
      recurringFrequency: "monthly",
      recurringEndDate: "",
      cardId: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (t: Transaction) => {
    // Ao editar, precisamos garantir que o input date receba YYYY-MM-DD
    const safeDateForInput = t.date.split("T")[0];

    if (t.isProjection) {
      setSelectedTransaction(null);
      // Calcula data projetada correta para o input
      // Como é projeção, pegamos o dia original e aplicamos ao mês/ano selecionado
      const originalDay = safeDateForInput.split("-")[2];
      const projectedInputDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${originalDay}`;

      setFormData({
        ...t,
        date: projectedInputDate,
        isProjection: false,
      });
    } else {
      setSelectedTransaction(t);
      setFormData({
        ...t,
        amount: Number(t.amount),
        date: safeDateForInput,
        recurringEndDate: t.recurringEndDate || "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.description || !formData.amount) return;
    const catObj = transactionCategories.find(
      (c) => c.value === formData.category,
    );
    const icon = catObj ? catObj.icon : "📝";
    const dataToSave = {
      ...formData,
      amount: Number(formData.amount),
      categoryIcon: icon,
      cardId:
        formData.category === "Cartão de Crédito" ? formData.cardId : null,
      recurringFrequency: formData.recurring
        ? formData.recurringFrequency
        : "monthly",
      recurringEndDate: formData.recurring ? formData.recurringEndDate : "",
    };

    if (selectedTransaction && !selectedTransaction.isProjection) {
      onEditTransaction(selectedTransaction.id, dataToSave);
    } else {
      onAddTransaction(dataToSave);
    }
    setIsModalOpen(false);
  };

  // --- LÓGICA DE PROJEÇÃO ---
  const filteredTransactions = useMemo(() => {
    const realTransactions = transactions.filter((t) => {
      if (!t.date || typeof t.date !== "string") return false;
      const [y, m] = t.date.split("T")[0].split("-");
      return parseInt(m) - 1 === selectedMonth && parseInt(y) === selectedYear;
    });

    const projections: Transaction[] = [];
    const existingSignatures = new Set(
      realTransactions.map((t) => `${t.description.toLowerCase()}-${t.amount}`),
    );

    transactions.forEach((t) => {
      if (t.recurring) {
        if (!t.date || typeof t.date !== "string") return;

        const [tYearStr, tMonthStr, tDayStr] = t.date.split("T")[0].split("-");
        const tYear = parseInt(tYearStr);
        const tMonth = parseInt(tMonthStr) - 1;
        const tDay = parseInt(tDayStr);

        // Usamos new Date APENAS para comparação lógica (ano/mes), não para display
        const originDate = new Date(tYear, tMonth, tDay);
        const targetDate = new Date(selectedYear, selectedMonth, tDay);

        // Regra 1: Não projeta antes da criação
        if (targetDate <= originDate) return;

        // Regra 2: Data Final
        if (t.recurringEndDate) {
          const [endY, endM, endD] = t.recurringEndDate.split("-");
          const endDate = new Date(
            parseInt(endY),
            parseInt(endM) - 1,
            parseInt(endD),
          );
          if (targetDate > endDate) return;
        }

        // Regra 3: Frequência
        let shouldProject = false;
        if (t.recurringFrequency === "monthly") shouldProject = true;
        else if (t.recurringFrequency === "yearly" && tMonth === selectedMonth)
          shouldProject = true;

        if (shouldProject) {
          const signature = `${t.description.toLowerCase()}-${t.amount}`;
          if (!existingSignatures.has(signature)) {
            // Monta string YYYY-MM-DD manualmente para a projeção
            const projDateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(tDay).padStart(2, "0")}`;

            projections.push({
              ...t,
              id: `proj-${t.id}-${selectedMonth}-${selectedYear}`,
              date: projDateStr,
              isProjection: true,
            });
          }
        }
      }
    });

    const allItems = [...realTransactions, ...projections];
    const search = searchTerm.toLowerCase();

    return allItems
      .filter(
        (t) =>
          t.description.toLowerCase().includes(search) ||
          t.category.toLowerCase().includes(search),
      )
      .sort((a, b) => {
        // Ordenação precisa converter para Time, mas para display usaremos a string
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
  }, [transactions, searchTerm, selectedMonth, selectedYear]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const currentData = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.tableHeader}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.filters}>
          <button
            className={styles.dateTriggerBtn}
            onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
          >
            <Calendar size={16} />
            <span>
              {months[selectedMonth]} {selectedYear}
            </span>
            <ChevronDown size={14} />
          </button>
          {isDatePickerOpen && (
            <div className={styles.datePopover}>
              <div className={styles.popoverHeader}>
                <button onClick={() => setSelectedYear((y) => y - 1)}>
                  <ChevronLeft size={16} />
                </button>
                <span>{selectedYear}</span>
                <button onClick={() => setSelectedYear((y) => y + 1)}>
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className={styles.monthsGrid}>
                {months.map((m, i) => (
                  <button
                    key={m}
                    className={i === selectedMonth ? styles.activeMonth : ""}
                    onClick={() => {
                      setSelectedMonth(i);
                      setIsDatePickerOpen(false);
                      setCurrentPage(1);
                    }}
                  >
                    {m.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button className={styles.addBtn} onClick={openCreateModal}>
            <Plus size={18} /> <span>Nova</span>
          </button>
        </div>
      </div>

      {/* TABELA */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Data</th>
              <th>Valor</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((t) => (
                <tr
                  key={t.id}
                  className={t.isProjection ? styles.projectionRow : ""}
                >
                  <td>
                    <div className={styles.descCell}>
                      <div className={styles.iconBox}>{t.categoryIcon}</div>
                      <div className={styles.descText}>
                        <span className={styles.title}>
                          {t.description}{" "}
                          {t.isProjection && (
                            <span
                              style={{
                                fontSize: "10px",
                                marginLeft: "6px",
                                color: "#7B61FF",
                              }}
                            >
                              (Futuro)
                            </span>
                          )}
                        </span>
                        {t.recurring && (
                          <span
                            style={{
                              fontSize: "10px",
                              color: "#888",
                              display: "flex",
                              gap: "4px",
                            }}
                          >
                            <RefreshCw size={10} />{" "}
                            {t.recurringFrequency === "yearly"
                              ? "Anual"
                              : "Mensal"}
                          </span>
                        )}
                        {t.category === "Cartão de Crédito" && t.cardId && (
                          <span
                            style={{
                              fontSize: "10px",
                              color: "#9488f0",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <CreditCard size={10} />{" "}
                            {cards.find((c) => c.id === t.cardId)?.bank ||
                              "Cartão"}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={styles.categoryTag}>{t.category}</span>
                  </td>
                  {/* AQUI ESTÁ A CORREÇÃO PRINCIPAL: USAR formatDateNoTimezone */}
                  <td>{formatDateNoTimezone(t.date)}</td>
                  <td>
                    <span
                      className={
                        t.type === "income" ? styles.income : styles.expense
                      }
                    >
                      {t.type === "income" ? "+" : "-"} R${" "}
                      {Number(t.amount).toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.editBtn}
                        onClick={() => openEditModal(t)}
                      >
                        {t.isProjection ? (
                          <Plus size={16} />
                        ) : (
                          <Edit size={16} />
                        )}
                      </button>
                      {!t.isProjection && (
                        <button
                          className={styles.deleteBtn}
                          onClick={() => {
                            setSelectedTransaction(t);
                            setIsDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className={styles.emptyState}>
                  Nada encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            {currentPage} de {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          selectedTransaction?.isProjection
            ? "Confirmar"
            : selectedTransaction
              ? "Editar"
              : "Nova"
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
              placeholder="Ex: Netflix"
            />
          </div>
          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Valor</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: Number(e.target.value) })
                }
              />
            </div>
            <div className={styles.formGroup}>
              <label>Tipo</label>
              <div className={styles.typeToggle}>
                <button
                  className={formData.type === "expense" ? styles.active : ""}
                  onClick={() => setFormData({ ...formData, type: "expense" })}
                >
                  Despesa
                </button>
                <button
                  className={formData.type === "income" ? styles.active : ""}
                  onClick={() => setFormData({ ...formData, type: "income" })}
                >
                  Receita
                </button>
              </div>
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Categoria</label>
              <CustomSelect
                options={transactionCategories}
                value={formData.category}
                onChange={(v) => setFormData({ ...formData, category: v })}
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
          {formData.category === "Cartão de Crédito" && (
            <div className={styles.formGroup}>
              <label>Cartão</label>
              <select
                className={styles.nativeSelect}
                value={formData.cardId || ""}
                onChange={(e) =>
                  setFormData({ ...formData, cardId: e.target.value })
                }
              >
                <option value="">Selecione...</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.bank} •••• {c.number.slice(-4)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.recurringBox}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.recurring}
                onChange={(e) =>
                  setFormData({ ...formData, recurring: e.target.checked })
                }
              />{" "}
              Repetir transação?
            </label>
            {formData.recurring && (
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>Frequência</label>
                  <select
                    className={styles.nativeSelect}
                    value={formData.recurringFrequency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurringFrequency: e.target.value as any,
                      })
                    }
                  >
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>Data Final</label>
                  <input
                    type="date"
                    className={styles.nativeSelect}
                    value={formData.recurringEndDate || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurringEndDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
          <button className={styles.saveBtn} onClick={handleSave}>
            Salvar
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir"
      >
        <div style={{ textAlign: "center", padding: "20px" }}>
          <p>Confirmar exclusão?</p>
          <div className={styles.modalActions}>
            <button
              className={styles.cancelButton}
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              className={styles.deleteConfirmButton}
              onClick={() => {
                onDeleteTransaction(selectedTransaction!.id);
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
