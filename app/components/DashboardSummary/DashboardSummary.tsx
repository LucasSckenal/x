'use client';

import { useEffect, useState } from 'react';
import { db, auth } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import styles from './DashboardSummary.module.scss';

export default function DashboardSummary() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      setUserName(user.displayName || 'Usuário');

      const snapshot = await getDocs(collection(db, `users/${user.uid}/transactions`));
      const data = snapshot.docs.map(doc => doc.data());
      setTransactions(data);
    };

    fetchData();
  }, []);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, cur) => acc + cur.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, cur) => acc + cur.amount, 0);

  const balance = totalIncome - totalExpense;

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h1 className={styles.greeting}>Olá, {userName.split(' ')[0]} 👋</h1>
      <p className={styles.subtitle}>Aqui está um resumo rápido das suas finanças</p>

      <div className={styles.cardsContainer}>
        <motion.div className={styles.card} whileHover={{ scale: 1.03 }}>
          <Wallet className={styles.icon} />
          <div>
            <h3>Saldo Atual</h3>
            <p className={balance >= 0 ? styles.positive : styles.negative}>
              R$ {balance.toFixed(2)}
            </p>
          </div>
        </motion.div>

        <motion.div className={styles.card} whileHover={{ scale: 1.03 }}>
          <TrendingUp className={styles.icon} />
          <div>
            <h3>Receitas do Mês</h3>
            <p className={styles.positive}>R$ {totalIncome.toFixed(2)}</p>
          </div>
        </motion.div>

        <motion.div className={styles.card} whileHover={{ scale: 1.03 }}>
          <TrendingDown className={styles.icon} />
          <div>
            <h3>Despesas do Mês</h3>
            <p className={styles.negative}>R$ {totalExpense.toFixed(2)}</p>
          </div>
        </motion.div>

        <motion.div className={styles.card} whileHover={{ scale: 1.03 }}>
          <PiggyBank className={styles.icon} />
          <div>
            <h3>Investido</h3>
            <p>R$ 10,00</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
