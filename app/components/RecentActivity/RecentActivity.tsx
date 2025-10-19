'use client';

import { motion } from 'framer-motion';
import { 
  ArrowDownLeft, ArrowUpRight, Clock, ShoppingCart, 
  Utensils, Car, Home, Receipt, ArrowRight 
} from 'lucide-react';
import { Transaction } from '../TransactionsTable/TransactionsTable';
import styles from './RecentActivity.module.scss';
import Link from 'next/link';

// Função para formatar a data de forma amigável
const timeAgo = (date: Date | null): string => {
  if (!date) return '';
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " anos atrás";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " meses atrás";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " dias atrás";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " horas atrás";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutos atrás";
  return "agora mesmo";
};

// Mapeamento de categorias para ícones
const getCategoryIcon = (category: string | undefined) => {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('comida') || cat.includes('restaurante')) return <Utensils size={18} />;
  if (cat.includes('mercado') || cat.includes('compras')) return <ShoppingCart size={18} />;
  if (cat.includes('transporte')) return <Car size={18} />;
  if (cat.includes('moradia') || cat.includes('aluguel')) return <Home size={18} />;
  if (cat.includes('contas')) return <Receipt size={18} />;
  return <ArrowDownLeft size={18} />;
}

export default function RecentActivity({ transactions }: { transactions: Transaction[] }) {
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className={styles.container}>
      {/* Cabeçalho do Card */}
      <div className={styles.cardHeader}>
        <h4>Atividade Recente</h4>
        <Link href="/dashboard?tab=transactions" className={styles.viewAllLink}>
          Ver todas <ArrowRight size={14} />
        </Link>
      </div>

      {recentTransactions.length > 0 ? (
        <ul className={styles.activityList}>
          {recentTransactions.map((t, index) => (
            <motion.li 
              key={t.id}
              className={styles.activityItem}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className={`${styles.iconWrapper} ${t.type === 'income' ? styles.income : styles.expense}`}>
                {t.type === 'income' ? <ArrowUpRight size={18} /> : getCategoryIcon(t.category)}
              </div>
              <div className={styles.activityDetails}>
                <span className={styles.description}>{t.description}</span>
                <span className={styles.time}>{timeAgo(t.date?.toDate())}</span>
              </div>
              <span className={`${styles.amount} ${t.type === 'income' ? styles.incomeText : styles.expenseText}`}>
                {t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </motion.li>
          ))}
        </ul>
      ) : (
        <div className={styles.noActivity}>
          <Clock size={32} />
          <p>Nenhuma transação recente encontrada.</p>
        </div>
      )}
    </div>
  );
}