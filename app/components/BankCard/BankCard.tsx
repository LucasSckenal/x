"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import styles from "./BankCard.module.scss";

interface BankCardProps {
  id: string;
  bankName: string;
  cardNumber: string;
  expiryDate: string;
  brand: string;
  currentInvoice: number;
  nextInvoice: number;
  dueDay: string;
  isFutureInvoice: boolean;
  onDelete: (id: string) => void;
  onEdit: () => void;
}

export const BankCard: React.FC<BankCardProps> = ({
  id,
  bankName,
  cardNumber,
  expiryDate,
  brand,
  currentInvoice,
  nextInvoice,
  dueDay,
  isFutureInvoice,
  onDelete,
  onEdit,
}) => {
  const getCardGradient = () => {
    const name = bankName ? bankName.toLowerCase() : "";
    if (name.includes("nubank"))
      return "linear-gradient(135deg, #820ad1 0%, #400080 100%)";
    if (name.includes("picpay"))
      return "linear-gradient(135deg, #11C76F 0%, #008f4c 100%)";
    if (name.includes("inter"))
      return "linear-gradient(135deg, #ff7a00 0%, #ff5000 100%)";
    if (name.includes("itaú") || name.includes("itau"))
      return "linear-gradient(135deg, #ec7000 0%, #b85300 100%)";
    if (name.includes("xp"))
      return "linear-gradient(135deg, #2c2c2c 0%, #000000 100%)";
    if (name.includes("santander"))
      return "linear-gradient(135deg, #cc0000 0%, #990000 100%)";
    if (name.includes("c6"))
      return "linear-gradient(135deg, #242424 0%, #000000 100%)";
    if (name.includes("bradesco"))
      return "linear-gradient(135deg, #cc092f 0%, #990020 100%)";
    if (name.includes("neon"))
      return "linear-gradient(135deg, #00a4a6 0%, #007577 100%)";
    if (name.includes("next"))
      return "linear-gradient(135deg, #00ff5f 0%, #00b342 100%)";
    if (brand === "Visa")
      return "linear-gradient(135deg, #1a1f71 0%, #0055a5 100%)";
    if (brand === "Mastercard")
      return "linear-gradient(135deg, #eb001b 0%, #b30015 100%)";
    return "linear-gradient(135deg, #3a3a45 0%, #23232b 100%)";
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(id);
  };

  return (
    <div
      className={styles.cardContainer}
      style={{ background: getCardGradient() }}
    >
      <div className={styles.cardHeader}>
        <div className={styles.chip}></div>

        <button
          className={styles.deleteBtn}
          onClick={handleDeleteClick}
          type="button"
          title="Excluir Cartão"
          style={{ cursor: "pointer", position: "relative", zIndex: 999 }}
        >
          <Trash2 size={18} color="#fff" style={{ pointerEvents: "none" }} />
        </button>
      </div>

      <div className={styles.editArea} onClick={onEdit}>
        <div className={styles.cardBody}>
          <div className={styles.bankName}>{bankName || "Banco"}</div>
          <div className={styles.cardNumber}>
            {cardNumber || "**** **** **** 0000"}
          </div>
        </div>

        <div className={styles.cardFooter}>
          <div className={styles.leftInfo}>
            <span className={styles.label}>Vence dia {dueDay}</span>
            <span className={styles.exp}>{expiryDate}</span>
          </div>

          <div className={styles.rightInfo}>
            <span className={styles.invoiceLabel}>
              {isFutureInvoice ? "Próxima Fatura" : "Fatura Atual"}
            </span>
            <span className={styles.total}>
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(isFutureInvoice ? nextInvoice : currentInvoice)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
