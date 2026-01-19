import React from "react";
import { Wifi, Trash2 } from "lucide-react";
import styles from "../../transactions/Dashboard.module.scss";

interface BankCardProps {
  id: string; // Adicionado ID para exclusão
  bankName: string;
  cardNumber: string;
  expiryDate: string;
  brand: string;
  onDelete: (id: string) => void; // Nova prop
}

// Subcomponente de Logo (mantido igual)
const CardBrandLogo = ({ brand }: { brand: string }) => {
  const b = brand.toLowerCase();
  if (b === "mastercard")
    return (
      <svg width="40" height="24" viewBox="0 0 50 30" fill="none">
        <circle cx="18" cy="15" r="15" fill="#EB001B" fillOpacity="0.8" />
        <circle cx="32" cy="15" r="15" fill="#F79E1B" fillOpacity="0.8" />
      </svg>
    );
  if (b === "visa")
    return (
      <svg width="45" height="15" viewBox="0 0 100 32" fill="none">
        <path
          fill="#fff"
          d="M33.8 1.2H43L40.8 29H31.5L33.8 1.2ZM19.2 1.2C17.5 1.2 16.5 2.1 15.9 3.6L6.8 25.2H0L14 1.2H19.2ZM65.2 12.6C65.2 7.7 58.4 7.4 58.5 5.3C58.5 4.6 59.2 3.9 61.3 3.7C62.3 3.6 65.1 3.5 68.3 5L69.6 0.9C67.8 0.3 65.5 0 62.7 0C55.7 0 50.8 3.7 50.8 8.9C50.7 12.9 54.3 15.1 57.1 16.5C59.9 17.9 60.9 18.7 60.9 19.9C60.9 21.7 58.7 22.5 56.6 22.5C52.6 22.5 50.2 21.6 48.4 20.8L47 25.1C48.8 25.9 52.3 26.6 56.1 26.6C63.6 26.6 68.5 22.9 68.6 17.6M87.8 26.3H95.3L88.7 1.2H81.2C79.5 1.2 78.1 2.2 77.5 3.8L66.2 29h9.6l1.9-5.3h11.9L87.8 26.3Z"
        />
      </svg>
    );
  if (b === "elo")
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" />
        <path d="M7 7h10v3H7z" fill="red" />
        <path d="M7 11h10v3H7z" fill="yellow" />
        <path d="M7 15h10v3H7z" fill="green" />
      </svg>
    );
  return (
    <span style={{ fontWeight: 800, fontStyle: "italic", fontSize: "16px" }}>
      {brand}
    </span>
  );
};

export const BankCard = ({
  id,
  bankName,
  cardNumber,
  expiryDate,
  brand,
  onDelete,
}: BankCardProps) => {
  const getBankClass = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("nubank")) return styles.bank_nubank;
    if (n.includes("xp")) return styles.bank_xp;
    if (n.includes("banrisul")) return styles.bank_banrisul;
    if (n.includes("picpay")) return styles.bank_picpay;
    if (n.includes("c6")) return styles.bank_c6;
    if (n.includes("sicredi")) return styles.bank_sicredi;
    if (n.includes("inter")) return styles.bank_inter;
    return styles.bank_default;
  };

  return (
    <div className={`${styles.creditCard} ${getBankClass(bankName)}`}>
      {/* Botão de Excluir (visível no hover via CSS ou sempre visível, ajustável) */}
      <button
        className={styles.deleteCardBtn}
        onClick={(e) => {
          e.stopPropagation(); // Evita cliques indesejados
          if (confirm("Deseja realmente remover este cartão?")) onDelete(id);
        }}
        title="Remover cartão"
      >
        <Trash2 size={16} color="#fff" />
      </button>

      <div className={styles.cardTop}>
        <div className={styles.bankInfo}>
          <Wifi size={22} style={{ transform: "rotate(90deg)" }} />
          <span>{bankName}</span>
        </div>
      </div>

      <div className={styles.cardNumber}>{cardNumber}</div>

      <div className={styles.cardFooter}>
        <div>
          <div style={{ fontSize: "10px", opacity: 0.7, marginBottom: "2px" }}>
            VALID THRU
          </div>
          <div style={{ fontWeight: 500 }}>{expiryDate}</div>
        </div>
        <div className={styles.brandLogoContainer}>
          <CardBrandLogo brand={brand} />
        </div>
      </div>
    </div>
  );
};
