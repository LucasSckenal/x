"use client";

import React, { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  X,
  Plus,
  TrendingUp,
  CreditCard as CreditIcon,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";

import { Sidebar } from "../components/Sidebar/Sidebar";
import Header from "../components/Header/Header";
import TransactionsTable from "../components/TransactionsTable/TransactionsTable";
import Charts from "../components/Charts/Charts";
import { BankCard } from "../components/BankCard/BankCard";
import styles from "./Dashboard.module.scss";

// --- HELPERS CORRIGIDOS ---

const detectCardBrand = (number: string): string => {
  const clean = number.replace(/\D/g, "");
  if (/^4/.test(clean)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(clean)) return "Mastercard";
  if (/^3[47]/.test(clean)) return "Amex";
  if (
    /^(4011|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(
      clean,
    )
  )
    return "Elo";
  return "Outra";
};

// Extrai data sem erro de fuso horário
const parseSafeDate = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return { year, monthIndex: month - 1, day };
};

const isRecurrenceActive = (
  transactionDate: string,
  endDate: string | undefined,
  targetYear: number,
  targetMonth: number,
): boolean => {
  if (!endDate) return true;
  const { year: eY, monthIndex: eM } = parseSafeDate(endDate);
  if (targetYear < eY) return true;
  if (targetYear === eY && targetMonth <= eM) return true;
  return false;
};

// Define o mês base como o mês atual do calendário
const getBaseInvoiceDate = () => {
  const today = new Date();
  return { targetMonth: today.getMonth(), targetYear: today.getFullYear() };
};

const getInvoiceMonthName = (targetMonth: number, targetYear: number) => {
  const monthNames = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return `${monthNames[targetMonth]}/${targetYear}`;
};

// Função para gerar gradiente baseado no banco/bandeira
const getCardGradient = (bankName: string, brand: string) => {
  const name = bankName ? bankName.toLowerCase() : "";
  if (name.includes("nubank"))
    return "linear-gradient(135deg, #820ad1 0%, #400080 100%)";
  if (name.includes("picpay"))
    return "linear-gradient(135deg, #11C76F 0%, #008f4c 100%)";
  if (name.includes("inter"))
    return "linear-gradient(135deg, #ff7a00 0%, #ff5000 100%)";
  if (name.includes("itau") || name.includes("itaú"))
    return "linear-gradient(135deg, #ec7000 0%, #b85300 100%)";
  if (name.includes("xp"))
    return "linear-gradient(135deg, #2c2c2c 0%, #000000 100%)";
  if (name.includes("santander"))
    return "linear-gradient(135deg, #cc0000 0%, #990000 100%)";
  if (name.includes("c6"))
    return "linear-gradient(135deg, #242424 0%, #000000 100%)";
  if (brand === "Visa")
    return "linear-gradient(135deg, #1a1f71 0%, #0055a5 100%)";
  if (brand === "Mastercard")
    return "linear-gradient(135deg, #eb001b 0%, #b30015 100%)";
  return "linear-gradient(135deg, #3a3a45 0%, #23232b 100%)";
};

// Formatar número do cartão (1234567890123456 → 1234 5678 9012 3456)
const formatCardNumber = (num: string) => {
  const clean = num.replace(/\D/g, "");
  const groups = clean.match(/.{1,4}/g);
  return groups ? groups.join(" ") : clean;
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [newCard, setNewCard] = useState({
    bank: "",
    number: "",
    closingDay: "",
    dueDay: "",
    brand: "Mastercard",
    exp: "",
  });

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyCard, setHistoryCard] = useState<any | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "transactions"),
      orderBy("date", "desc"),
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        let finalDate = "";
        if (d.date && typeof d.date.toDate === "function") {
          const dateObj = d.date.toDate();
          finalDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
        } else if (typeof d.date === "string") {
          finalDate = d.date.split("T")[0];
        }
        return {
          id: doc.id,
          ...d,
          amount: Number(d.amount) || 0,
          date: finalDate,
        };
      });
      setTransactions(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "cards"));
    const unsub = onSnapshot(q, (snapshot) => {
      setCards(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user]);

  // --- LÓGICA DE CÁLCULO REVISADA ---
  const calculateInvoiceTotal = (
    cardId: string,
    targetMonth: number,
    targetYear: number,
    closingDay: number,
  ) => {
    const cardTransactions = transactions.filter(
      (t) => t.cardId === cardId && t.type === "expense",
    );
    let total = 0;

    cardTransactions.forEach((t) => {
      if (!t.date) return;

      const { year: tY, monthIndex: tM, day: tD } = parseSafeDate(t.date);

      if (t.recurring) {
        const targetRef = new Date(targetYear, targetMonth, 1);
        const recurStartRef = new Date(tY, tM, 1);
        if (targetRef < recurStartRef) return;
        if (
          !isRecurrenceActive(
            t.date,
            t.recurringEndDate,
            targetYear,
            targetMonth,
          )
        )
          return;

        if (t.recurringFrequency === "monthly" || !t.recurringFrequency) {
          total += Number(t.amount);
        } else if (t.recurringFrequency === "yearly" && tM === targetMonth) {
          total += Number(t.amount);
        }
        return;
      }

      /**
       * NOVA REGRA:
       * Se comprou ANTES do fechamento, pertence à fatura do mês ANTERIOR (ciclo passado).
       * Se comprou NO DIA ou DEPOIS do fechamento, pertence à fatura deste MÊS.
       * Isso faz com que compras em Janeiro fiquem visíveis em Janeiro.
       */
      let invoiceMonth = tD >= closingDay ? tM : tM - 1;
      let invoiceYear = tY;

      if (invoiceMonth < 0) {
        invoiceMonth = 11;
        invoiceYear--;
      }

      if (invoiceMonth === targetMonth && invoiceYear === targetYear) {
        total += Number(t.amount);
      }
    });

    return total;
  };

  const calculateBothInvoices = (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return { current: 0, next: 0, total: 0 };

    const closingDay = parseInt(card.closingDay) || 1;
    const { targetMonth: curM, targetYear: curY } = getBaseInvoiceDate();

    let nextM = curM + 1;
    let nextY = curY;
    if (nextM > 11) {
      nextM = 0;
      nextY++;
    }

    const current = calculateInvoiceTotal(cardId, curM, curY, closingDay);
    const next = calculateInvoiceTotal(cardId, nextM, nextY, closingDay);

    return { current, next, total: current + next };
  };

  const getAllInvoices = (card: any) => {
    const closingDay = parseInt(card.closingDay) || 1;
    const { targetMonth: baseMonth, targetYear: baseYear } = getBaseInvoiceDate();
    const invoices = [];

    for (let i = -6; i <= 6; i++) {
      let m = baseMonth + i;
      let y = baseYear;
      while (m < 0) {
        m += 12;
        y--;
      }
      while (m > 11) {
        m -= 12;
        y++;
      }

      const total = calculateInvoiceTotal(card.id, m, y, closingDay);

      // Ignorar meses com valor zero
      if (total === 0 && i !== 0 && i !== 1) {
        continue;
      }

      let statusLabel = "Futura";
      if (i === 0) statusLabel = "Atual";
      else if (i === 1) statusLabel = "Próxima";
      else if (i < 0) statusLabel = "Paga";

      invoices.push({
        monthIndex: m,
        year: y,
        total,
        statusLabel,
        displayName: getInvoiceMonthName(m, y),
        isCurrent: i === 0,
        isNext: i === 1,
        isPast: i < 0,
      });
    }

    return invoices.sort(
      (a, b) => b.year - a.year || b.monthIndex - a.monthIndex,
    );
  };

  // --- HANDLERS (CRUD) ---
  const handleSaveCard = async () => {
    if (!newCard.bank || !newCard.number) {
      toast.error("Preencha banco e número.");
      return;
    }
    if (!user) return;
    try {
      const payload = { ...newCard, updatedAt: Timestamp.now() };
      if (editingCardId) {
        await updateDoc(
          doc(db, "users", user.uid, "cards", editingCardId),
          payload,
        );
        toast.success("Cartão atualizado!");
      } else {
        await addDoc(collection(db, "users", user.uid, "cards"), {
          ...payload,
          createdAt: Timestamp.now(),
        });
        toast.success("Cartão criado!");
      }
      setIsCardModalOpen(false);
      setEditingCardId(null);
      setNewCard({
        bank: "",
        number: "",
        closingDay: "",
        dueDay: "",
        brand: "Mastercard",
        exp: "",
      });
    } catch (e) {
      toast.error("Erro ao salvar.");
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!user) return;
    if (confirm("Excluir este cartão?")) {
      await deleteDoc(doc(db, "users", user.uid, "cards", id));
      toast.success("Removido.");
    }
  };

  const openHistory = (card: any) => {
    setHistoryCard(card);
    setIsHistoryModalOpen(true);
  };

  if (loading)
    return <div style={{ color: "#fff", padding: 20 }}>Carregando...</div>;
  if (!user)
    return <div style={{ color: "#fff", padding: 20 }}>Faça login.</div>;

  return (
    <div className={styles.pageWrap}>
      <Sidebar />
      <main className={styles.mainContent}>
        {/*TIRAR ELE DAQUI QUEBRA TUDO POR ALGUM MOTIVO*/}
        <Header user={user} />
        <div className={styles.container}>
          <div className={styles.dashboardGrid}>
            <div className={styles.gridMain}>
              <div className={styles.widgetCard}>
                <div className={styles.sectionTitle}>
                  <div>
                    <span>Meus Cartões</span>
                  </div>
                  <button
                    className={styles.addCardBtn}
                    onClick={() => {
                      setEditingCardId(null);
                      setIsCardModalOpen(true);
                    }}
                  >
                    <Plus size={16} style={{ marginRight: 6 }} /> Adicionar
                  </button>
                </div>
                <div className={styles.cardsScroll}>
                  {cards.map((card) => {
                    const invoices = calculateBothInvoices(card.id);
                    // Badge visual de "vencido" apenas se hoje passou do dia de vencimento
                    const isDue = new Date().getDate() >= parseInt(card.dueDay);
                    return (
                      <BankCard
                        key={card.id}
                        id={card.id}
                        bankName={card.bank}
                        cardNumber={card.number}
                        expiryDate={card.exp || "00/00"}
                        brand={card.brand}
                        currentInvoice={invoices.current}
                        nextInvoice={invoices.next}
                        dueDay={card.dueDay}
                        isFutureInvoice={isDue}
                        onDelete={handleDeleteCard}
                        onEdit={() => {
                          setEditingCardId(card.id);
                          setNewCard(card);
                          setIsCardModalOpen(true);
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div className={styles.widgetCard}>
                <div className={styles.sectionTitle}>
                  <span>Histórico</span>
                </div>
                <TransactionsTable
                  transactions={transactions}
                  cards={cards}
                  onAddTransaction={(d: any) =>
                    addDoc(collection(db, "users", user!.uid, "transactions"), {
                      ...d,
                      createdAt: Timestamp.now(),
                    })
                  }
                  onEditTransaction={(id: string, d: any) =>
                    updateDoc(
                      doc(db, "users", user!.uid, "transactions", id),
                      d,
                    )
                  }
                  onDeleteTransaction={(id: string) =>
                    deleteDoc(doc(db, "users", user!.uid, "transactions", id))
                  }
                />
              </div>
            </div>

            <div className={styles.gridSidebar}>
              <Charts transactions={transactions} />

              <div className={styles.widgetCard}>
                <div className={styles.sectionTitle}>
                  <span>Resumo de Faturas</span>
                </div>
                <div className={styles.invoiceList}>
                  {cards.map((card) => {
                    const invoices = getAllInvoices(card);
                    const current = invoices.find((inv) => inv.isNext);
                    if (!current) return null;
                    return (
                      <div
                        key={card.id}
                        style={{
                          marginBottom: 15,
                          borderBottom: "1px solid #333",
                          paddingBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 5,
                          }}
                        >
                          <span style={{ fontSize: 12, color: "#888" }}>
                            {card.bank}
                          </span>
                          <button
                            onClick={() => openHistory(card)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#21c25e",
                              fontSize: 11,
                              cursor: "pointer",
                            }}
                          >
                            <Calendar size={12} style={{ marginRight: 3 }} />{" "}
                            Histórico
                          </button>
                        </div>
                        <div className={styles.invoiceItem}>
                          <div className={styles.invoiceInfo}>
                            <div className={styles.invoiceIcon}>
                              <CreditIcon size={18} />
                            </div>
                            <div className={styles.invoiceText}>
                              <strong>{current.displayName}</strong>
                              <span>
                                {current.statusLabel} - Vence dia {card.dueDay}
                              </span>
                            </div>
                          </div>
                          <div className={styles.invoiceAmount}>
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(current.total)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Adicionar/Editar Cartão */}
      {/* Modal de Adicionar/Editar Cartão */}
      {isCardModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsCardModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <CreditIcon
                  size={22}
                  style={{ marginRight: 10, color: "#21c25e" }}
                />
                <h3>
                  {editingCardId ? "Editar Cartão" : "Adicionar Novo Cartão"}
                </h3>
              </div>
              <button
                className={styles.closeBtn}
                onClick={() => setIsCardModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Preview do Cartão */}
              <div className={styles.previewSection}>
                <div className={styles.previewLabel}>
                  <span>Pré-visualização</span>
                  <small>O cartão será exibido assim no dashboard</small>
                </div>
                <div className={styles.previewWrapper}>
                  <div
                    className={styles.previewCard}
                    style={{
                      background: getCardGradient(newCard.bank, newCard.brand),
                      transform: "scale(0.9)",
                    }}
                  >
                    <div className={styles.previewCardHeader}>
                      <div className={styles.previewChip}></div>
                      <div className={styles.previewBrand}>
                        {newCard.brand || "Mastercard"}
                      </div>
                    </div>
                    <div className={styles.previewCardBody}>
                      <div className={styles.previewBankName}>
                        {newCard.bank || "Nome do Banco"}
                      </div>
                      <div className={styles.previewCardNumber}>
                        {newCard.number
                          ? formatCardNumber(newCard.number)
                          : "**** **** **** ****"}
                      </div>
                    </div>
                    <div className={styles.previewCardFooter}>
                      <div className={styles.previewExpiry}>
                        <span>VALIDADE</span>
                        <strong>{newCard.exp || "MM/AA"}</strong>
                      </div>
                      <div className={styles.previewDue}>
                        <span>VENCIMENTO</span>
                        <strong>Dia {newCard.dueDay || "--"}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formulário com validações */}
              <div className={styles.formSection}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>
                      <span>Banco *</span>
                      <input
                        type="text"
                        value={newCard.bank}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewCard({ ...newCard, bank: value });
                          if (value) {
                            e.target.classList.remove(styles.inputError);
                          }
                        }}
                        placeholder="Ex: Nubank, Inter, Itaú..."
                        className={!newCard.bank && styles.inputError}
                        required
                      />
                      {!newCard.bank && (
                        <span className={styles.errorMessage}>
                          Campo obrigatório
                        </span>
                      )}
                    </label>
                  </div>

                  <div className={styles.formGroup}>
                    <label>
                      <span>Número do Cartão *</span>
                      <div className={styles.inputWithIcon}>
                        <input
                          type="text"
                          value={formatCardNumber(newCard.number)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "");
                            const formatted = formatCardNumber(raw);
                            setNewCard({
                              ...newCard,
                              number: raw,
                              brand: raw ? detectCardBrand(raw) : "Mastercard",
                            });
                            if (raw.length >= 13) {
                              e.target.classList.remove(styles.inputError);
                            }
                          }}
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                          className={
                            newCard.number.length < 13 &&
                            newCard.number.length > 0 &&
                            styles.inputError
                          }
                          required
                        />
                        {newCard.brand && (
                          <div className={styles.brandIndicator}>
                            {newCard.brand}
                          </div>
                        )}
                      </div>
                      {newCard.number.length > 0 &&
                        newCard.number.length < 13 && (
                          <span className={styles.errorMessage}>
                            Número incompleto (mínimo 13 dígitos)
                          </span>
                        )}
                    </label>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>
                      <span>Dia de Fechamento *</span>
                      <div className={styles.dayInputGroup}>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={newCard.closingDay}
                          onChange={(e) => {
                            const value = Math.min(
                              31,
                              Math.max(1, parseInt(e.target.value) || 1),
                            );
                            setNewCard({
                              ...newCard,
                              closingDay: value.toString(),
                            });
                            if (value >= 1 && value <= 31) {
                              e.target.classList.remove(styles.inputError);
                            }
                          }}
                          placeholder="1-31"
                          className={
                            (!newCard.closingDay ||
                              parseInt(newCard.closingDay) < 1 ||
                              parseInt(newCard.closingDay) > 31) &&
                            styles.inputError
                          }
                          required
                        />
                        <span className={styles.dayLabel}>de cada mês</span>
                      </div>
                      {(!newCard.closingDay ||
                        parseInt(newCard.closingDay) < 1 ||
                        parseInt(newCard.closingDay) > 31) && (
                        <span className={styles.errorMessage}>
                          Digite um dia entre 1 e 31
                        </span>
                      )}
                    </label>
                  </div>

                  <div className={styles.formGroup}>
                    <label>
                      <span>Dia de Vencimento *</span>
                      <div className={styles.dayInputGroup}>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={newCard.dueDay}
                          onChange={(e) => {
                            const value = Math.min(
                              31,
                              Math.max(1, parseInt(e.target.value) || 1),
                            );
                            setNewCard({
                              ...newCard,
                              dueDay: value.toString(),
                            });
                            if (value >= 1 && value <= 31) {
                              e.target.classList.remove(styles.inputError);
                            }
                          }}
                          placeholder="1-31"
                          className={
                            (!newCard.dueDay ||
                              parseInt(newCard.dueDay) < 1 ||
                              parseInt(newCard.dueDay) > 31) &&
                            styles.inputError
                          }
                          required
                        />
                        <span className={styles.dayLabel}>de cada mês</span>
                      </div>
                      {(!newCard.dueDay ||
                        parseInt(newCard.dueDay) < 1 ||
                        parseInt(newCard.dueDay) > 31) && (
                        <span className={styles.errorMessage}>
                          Digite um dia entre 1 e 31
                        </span>
                      )}
                    </label>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>
                      <span>Validade (MM/AA) *</span>
                      <input
                        type="text"
                        value={newCard.exp}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, "");
                          if (value.length > 4) value = value.slice(0, 4);

                          let formatted = value;
                          if (value.length > 2) {
                            formatted = `${value.slice(0, 2)}/${value.slice(2)}`;
                          }

                          setNewCard({ ...newCard, exp: formatted });

                          // Validação básica de data
                          if (value.length === 4) {
                            const month = parseInt(value.slice(0, 2));
                            if (month >= 1 && month <= 12) {
                              e.target.classList.remove(styles.inputError);
                            }
                          }
                        }}
                        placeholder="MM/AA"
                        maxLength={5}
                        className={
                          newCard.exp.length === 5 && styles.inputError
                        }
                        required
                      />
                      {newCard.exp.length === 5 && (
                        <span className={styles.errorMessage}>
                          Formato inválido (ex: 12/25)
                        </span>
                      )}
                    </label>
                  </div>

                  <div className={styles.formGroup}>
                    <label>
                      <span>Bandeira</span>
                      <div className={styles.brandSelectWrapper}>
                        <select
                          value={newCard.brand}
                          onChange={(e) =>
                            setNewCard({ ...newCard, brand: e.target.value })
                          }
                          disabled={newCard.number.length >= 13}
                        >
                          <option value="Mastercard">Mastercard</option>
                          <option value="Visa">Visa</option>
                          <option value="Amex">American Express</option>
                          <option value="Elo">Elo</option>
                          <option value="Outra">Outra</option>
                        </select>
                        <div className={styles.autoDetectNote}>
                          {newCard.number.length >= 13
                            ? "Detectada automaticamente"
                            : "Selecione ou digite o número para detectar"}
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <div className={styles.footerInfo}>
                {editingCardId ? (
                  <span className={styles.editInfo}>
                    Editando cartão existente
                  </span>
                ) : (
                  <span className={styles.addInfo}>
                    Preencha todos os campos obrigatórios (*)
                  </span>
                )}
              </div>
              <div className={styles.footerActions}>
                <button
                  className={styles.secondaryBtn}
                  onClick={() => {
                    setIsCardModalOpen(false);
                    setEditingCardId(null);
                    setNewCard({
                      bank: "",
                      number: "",
                      closingDay: "",
                      dueDay: "",
                      brand: "Mastercard",
                      exp: "",
                    });
                  }}
                >
                  Cancelar
                </button>
                <button
                  className={styles.primaryBtn}
                  onClick={handleSaveCard}
                  disabled={
                    !newCard.bank ||
                    !newCard.number ||
                    newCard.number.length < 13 ||
                    !newCard.closingDay ||
                    !newCard.dueDay ||
                    !newCard.exp
                  }
                >
                  <CreditIcon size={16} style={{ marginRight: 8 }} />
                  {editingCardId ? "Atualizar Cartão" : "Salvar Cartão"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico de Faturas */}
      {isHistoryModalOpen && historyCard && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsHistoryModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>
                <CreditIcon size={18} style={{ marginRight: 10 }} />
                Histórico de Faturas - {historyCard.bank}
              </h3>
              <button
                className={styles.closeBtn}
                onClick={() => setIsHistoryModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* Preview do Cartão no Histórico */}
              <div className={styles.cardPreview}>
                <div
                  className={styles.previewCard}
                  style={{
                    background: getCardGradient(
                      historyCard.bank,
                      historyCard.brand,
                    ),
                  }}
                >
                  <div className={styles.previewCardHeader}>
                    <div className={styles.previewChip}></div>
                    <div className={styles.previewBrand}>
                      {historyCard.brand}
                    </div>
                  </div>
                  <div className={styles.previewCardBody}>
                    <div className={styles.previewBankName}>
                      {historyCard.bank}
                    </div>
                    <div className={styles.previewCardNumber}>
                      {formatCardNumber(historyCard.number)}
                    </div>
                  </div>
                  <div className={styles.previewCardFooter}>
                    <div className={styles.previewExpiry}>
                      <span>VALIDADE</span>
                      <strong>{historyCard.exp || "MM/AA"}</strong>
                    </div>
                    <div className={styles.previewDue}>
                      <span>VENCIMENTO</span>
                      <strong>Dia {historyCard.dueDay}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.historyInfo}>
                <div className={styles.infoRow}>
                  <span>Número:</span>
                  <strong>{historyCard.number}</strong>
                </div>
                <div className={styles.infoRow}>
                  <span>Fechamento:</span>
                  <strong>Dia {historyCard.closingDay}</strong>
                </div>
                <div className={styles.infoRow}>
                  <span>Vencimento:</span>
                  <strong>Dia {historyCard.dueDay}</strong>
                </div>
              </div>
              <div className={styles.historyTable}>
                <div className={styles.tableHeader}>
                  <div>Mês/Ano</div>
                  <div>Status</div>
                  <div>Valor</div>
                </div>
                {getAllInvoices(historyCard).map((invoice, idx) => (
                  <div
                    key={idx}
                    className={`${styles.tableRow} ${invoice.isCurrent ? styles.currentInvoice : ""}`}
                  >
                    <div>
                      <strong>{invoice.displayName}</strong>
                    </div>
                    <div>
                      <span
                        className={`${styles.statusBadge} ${
                          invoice.isCurrent
                            ? styles.current
                            : invoice.isNext
                              ? styles.next
                              : invoice.isPast
                                ? styles.past
                                : styles.future
                        }`}
                      >
                        {invoice.statusLabel}
                      </span>
                    </div>
                    <div className={styles.invoiceValue}>
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(invoice.total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.primaryBtn}
                onClick={() => setIsHistoryModalOpen(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}