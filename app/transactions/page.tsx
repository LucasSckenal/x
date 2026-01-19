"use client";
import { useState, useEffect } from "react";
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
import { ChevronRight, ShoppingBag, X } from "lucide-react";
import toast from "react-hot-toast";

import { Sidebar } from "../components/Sidebar/Sidebar";
import Header from "../components/Header/Header";
import TransactionsTable from "../components/TransactionsTable/TransactionsTable";
import Charts from "../components/Charts/Charts";
import { BankCard } from "../components/BankCard/BankCard"; // Certifique-se que o path está correto
import styles from "./Dashboard.module.scss";

// Função auxiliar de detecção (mesma de antes)
const detectCardBrand = (number: string): string => {
  const clean = number.replace(/\D/g, "");
  if (/^4/.test(clean)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(clean)) return "Mastercard";
  if (/^3[47]/.test(clean)) return "Amex";
  if (
    /^(4011|4389|4514|4576|5041|5067|5090|6277|6362|6363|650|6516|6550)/.test(
      clean
    )
  )
    return "Elo";
  return "Outra";
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estado para o novo cartão
  const [newCard, setNewCard] = useState({
    bank: "Nubank",
    number: "",
    exp: "",
    brand: "Mastercard",
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // Busca Cartões e Transações
  useEffect(() => {
    if (!user) return;

    // Cartões
    const qCards = query(collection(db, `users/${user.uid}/cards`));
    const unsubCards = onSnapshot(qCards, (s) => {
      setCards(s.docs.map((d) => ({ id: d.id, ...d.data() })) as any);
    });

    // Transações (mantido igual)
    const qTrans = query(
      collection(db, `users/${user.uid}/transactions`),
      orderBy("date", "desc")
    );
    const unsubTrans = onSnapshot(qTrans, (s) => {
      setTransactions(
        s.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          date: d.data().date?.toDate
            ? d.data().date.toDate().toISOString()
            : d.data().date,
        })) as any
      );
    });

    return () => {
      unsubCards();
      unsubTrans();
    };
  }, [user]);

  // --- VALIDAÇÃO E ADIÇÃO ---
  const handleAddCard = async () => {
    if (!user) return;

    // 1. Validação do Número (Deve ter 16 dígitos + 3 espaços = 19 chars)
    if (newCard.number.length < 19) {
      toast.error("O número do cartão parece incompleto.");
      return;
    }

    // 2. Validação da Data (MM/AA)
    const expRegex = /^(0[1-9]|1[0-2])\/?([0-9]{2})$/;
    if (!expRegex.test(newCard.exp)) {
      toast.error("Data inválida. Use o formato MM/AA (ex: 12/28)");
      return;
    }

    // 3. Validação de Banco
    if (!newCard.bank) {
      toast.error("Selecione um banco.");
      return;
    }

    try {
      await addDoc(collection(db, `users/${user.uid}/cards`), newCard);
      toast.success("Cartão adicionado!");
      setIsModalOpen(false);
      setNewCard({ bank: "Nubank", number: "", exp: "", brand: "Mastercard" }); // Reset
    } catch (e) {
      toast.error("Erro ao salvar cartão");
    }
  };

  // --- NOVA FUNÇÃO: EXCLUIR CARTÃO ---
  const handleDeleteCard = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/cards`, id));
      toast.success("Cartão removido.");
    } catch (error) {
      toast.error("Erro ao remover cartão.");
    }
  };

  // --- Handlers de Transações (mantidos para não quebrar a tabela) ---
  const handleAddTransaction = async (data: any) => {
    if (!user) return;
    try {
      await addDoc(collection(db, `users/${user.uid}/transactions`), {
        ...data,
        date: Timestamp.fromDate(new Date(data.date)),
        amount: Number(data.amount),
      });
      toast.success("Transação salva!");
    } catch (e) {
      toast.error("Erro ao salvar.");
    }
  };

  const handleEditTransaction = async (id: string, data: any) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/transactions`, id), {
        ...data,
        date: Timestamp.fromDate(new Date(data.date)),
        amount: Number(data.amount),
      });
      toast.success("Atualizado!");
    } catch (e) {
      toast.error("Erro ao editar.");
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/transactions`, id));
      toast.success("Excluído!");
    } catch (e) {
      toast.error("Erro ao excluir.");
    }
  };

  // Input Change com Máscara e Detecção
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    const brandDetected = detectCardBrand(val);
    val = val.replace(/(\d{4})/g, "$1 ").trim();
    setNewCard((prev) => ({
      ...prev,
      number: val,
      brand: brandDetected !== "Outra" ? brandDetected : prev.brand,
    }));
  };

  return (
    <div className={styles.pageWrap}>
      <Sidebar />
      <div className={styles.mainContent}>
        <Header />
        <main className={styles.container}>
          <div className={styles.dashboardGrid}>
            <div className={styles.gridMain}>
              <section className={styles.sectionCards}>
                <div className={styles.sectionTitle}>
                  <span>My cards</span>
                  <button
                    className={styles.addCardBtn}
                    onClick={() => setIsModalOpen(true)}
                  >
                    + Add Card
                  </button>
                </div>
                <div className={styles.cardsScroll}>
                  {cards.length === 0 && (
                    <span style={{ color: "#666", padding: "20px" }}>
                      Nenhum cartão cadastrado.
                    </span>
                  )}
                  {cards.map((card: any) => (
                    <BankCard
                      key={card.id}
                      id={card.id} // Passando ID
                      bankName={card.bank}
                      cardNumber={card.number}
                      expiryDate={card.exp}
                      brand={card.brand}
                      onDelete={handleDeleteCard} // Passando a função
                    />
                  ))}
                </div>
              </section>

              <section className={styles.widgetCard}>
                <div className={styles.sectionTitle}>Transactions</div>
                <TransactionsTable
                  transactions={transactions}
                  onAddTransaction={handleAddTransaction}
                  onEditTransaction={handleEditTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                />
              </section>
            </div>

            <div className={styles.gridSidebar}>
              <section className={styles.widgetCard}>
                <Charts transactions={transactions} />
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* MODAL ADICIONAR CARTÃO */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Novo Cartão</h3>
              <X onClick={() => setIsModalOpen(false)} cursor="pointer" />
            </div>

            <div className={styles.modalBody}>
              <div className={styles.previewZone}>
                <BankCard
                  id="preview"
                  bankName={newCard.bank}
                  cardNumber={newCard.number || "0000 0000 0000 0000"}
                  expiryDate={newCard.exp || "MM/AA"}
                  brand={newCard.brand}
                  onDelete={() => {}} // No preview não deleta
                />
              </div>

              <div className={styles.formGroup}>
                <label>Banco</label>
                <select
                  value={newCard.bank}
                  onChange={(e) =>
                    setNewCard({ ...newCard, bank: e.target.value })
                  }
                >
                  <option value="Nubank">Nubank</option>
                  <option value="XP">XP Investimentos</option>
                  <option value="Banrisul">Banrisul</option>
                  <option value="PicPay">PicPay</option>
                  <option value="C6 Bank">C6 Bank</option>
                  <option value="Sicredi">Sicredi</option>
                  <option value="Inter">Banco Inter</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Número do Cartão</label>
                <input
                  type="text"
                  maxLength={19}
                  placeholder="0000 0000 0000 0000"
                  value={newCard.number}
                  onChange={handleNumberChange}
                />
              </div>

              <div className={styles.row}>
                <div className={styles.formGroup}>
                  <label>Validade</label>
                  <input
                    type="text"
                    placeholder="MM/AA"
                    maxLength={5}
                    value={newCard.exp}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, "");
                      if (v.length >= 2)
                        v = v.substring(0, 2) + "/" + v.substring(2, 4);
                      setNewCard({ ...newCard, exp: v });
                    }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Bandeira</label>
                  <select
                    value={newCard.brand}
                    onChange={(e) =>
                      setNewCard({ ...newCard, brand: e.target.value })
                    }
                  >
                    <option value="Mastercard">Mastercard</option>
                    <option value="Visa">Visa</option>
                    <option value="Elo">Elo</option>
                    <option value="Amex">Amex</option>
                  </select>
                </div>
              </div>

              <button className={styles.saveBtn} onClick={handleAddCard}>
                Salvar Cartão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
