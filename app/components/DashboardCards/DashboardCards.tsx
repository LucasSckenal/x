'use client';

import { motion } from 'framer-motion';
import styles from './DashboardCards.module.scss';
import { CreditCard, ArrowUp, ArrowDown, Trophy, PiggyBank, TrendingUp, Wallet } from 'lucide-react';

export type DashboardData = {
  totalBalance?: number;
  expenses?: number;
  income?: number;
  goalsAchieved?: number;
  investedBalance?: number;
};

interface DashboardCardsProps {
  data: DashboardData;
}

export default function DashboardCards({ data }: DashboardCardsProps) {
  const formatCurrency = (value: number | undefined) => 
    (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const cards = [
    {
      key: 'balance',
      title: 'Saldo em Conta',
      value: formatCurrency(data.totalBalance),
      icon: Wallet,
      color: 'var(--text)',
      delay: 0.1
    },
    {
      key: 'invested',
      title: 'Total Investido',
      value: formatCurrency(data.investedBalance),
      icon: TrendingUp,
      color: 'var(--text)',
      delay: 0.2
    },
    {
      key: 'income',
      title: 'Receitas',
      value: formatCurrency(data.income),
      icon: ArrowUp,
      color: 'var(--positive)',
      delay: 0.3
    },
    {
      key: 'expenses',
      title: 'Gastos',
      value: formatCurrency(data.expenses),
      icon: ArrowDown,
      color: 'var(--negative)',
      delay: 0.4
    },
    {
      key: 'goals',
      title: 'Metas',
      value: `${data.goalsAchieved ?? 0}`,
      icon: Trophy,
      color: 'var(--text)',
      delay: 0.5
    }
  ];

  return (
    <div className={styles.cardsContainer}>
      {cards.map((card, index) => (
        <motion.div
          key={card.key}
          className={styles.card}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: card.delay }}
          whileHover={{ y: -2 }}
        >
          <div className={styles.iconWrapper} style={{ color: card.color }}>
            <card.icon className={styles.icon} />
          </div>
          
          <div className={styles.info}>
            <p className={styles.title}>{card.title}</p>
            <h2 className={styles.value} style={{ color: card.color }}>
              {card.value}
            </h2>
          </div>
        </motion.div>
      ))}
    </div>
  );
}