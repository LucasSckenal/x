'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, onSnapshot, orderBy, addDoc, updateDoc, doc } from 'firebase/firestore';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, LayoutDashboard, Plus, TrendingUp, TrendingDown, X, Target, DollarSign } from 'lucide-react';
import Image from 'next/image';

import Header from './components/Header/Header';
import PieChartCard from './components/PieChartCard/PieChartCard';
import { db, auth } from './lib/firebase';

// Interfaces
import { Transaction } from './components/TransactionsTable/TransactionsTable';
import { Goal } from './components/Goals/Goals';

// Componentes da Página
import RecentActivity from './components/RecentActivity/RecentActivity';
import GoalsPreview from './components/GoalsPreview/GoalsPreview';

import styles from './HomePage.module.scss';

// Sistema de dicas do dia
const DAILY_TIPS = [
  {
    id: 1,
    emoji: '💡',
    text: 'Separe automaticamente 10% do que receber para investir. Considere CDBs de liquidez diária para emergências.',
    category: 'Investimento'
  },
  {
    id: 2,
    emoji: '📊',
    text: 'Revise seus gastos semanais. Pequenas economias diárias podem fazer grande diferença no final do mês.',
    category: 'Economia'
  },
  {
    id: 3,
    emoji: '🎯',
    text: 'Estabeleça metas realistas. Metas muito ambiciosas podem desmotivar, enquanto metas pequenas demais não trazem crescimento.',
    category: 'Metas'
  },
  {
    id: 4,
    emoji: '🔄',
    text: 'Automátize suas finanças. Configure transferências automáticas para investimentos e contas de poupança.',
    category: 'Automação'
  },
  {
    id: 5,
    emoji: '🧮',
    text: 'Use a regra 50-30-20: 50% para necessidades, 30% para desejos e 20% para poupança e investimentos.',
    category: 'Orçamento'
  },
  {
    id: 6,
    emoji: '🚨',
    text: 'Mantenha uma reserva de emergência de 3 a 6 meses do seu custo de vida em aplicações de fácil acesso.',
    category: 'Segurança'
  },
  {
    id: 7,
    emoji: '📱',
    text: 'Use apps de controle financeiro para acompanhar seus gastos em tempo real e identificar padrões.',
    category: 'Tecnologia'
  },
  {
    id: 8,
    emoji: '💳',
    text: 'Evite dívidas no cartão de crédito. Se usar, pague o total da fatura para não acumular juros.',
    category: 'Crédito'
  },
  {
    id: 9,
    emoji: '📈',
    text: 'Diversifique seus investimentos. Não coloque todos os ovos na mesma cesta para reduzir riscos.',
    category: 'Investimento'
  },
  {
    id: 10,
    emoji: '🛒',
    text: 'Faça uma lista antes de ir ao mercado e evite compras por impulso. Isso pode reduzir seus gastos em até 30%.',
    category: 'Consumo'
  },
  {
    id: 11,
    emoji: '🎉',
    text: 'Comemore pequenas conquistas financeiras! Isso ajuda a manter a motivação no controle das finanças.',
    category: 'Motivação'
  },
  {
    id: 12,
    emoji: '📚',
    text: 'Invista em educação financeira. Conhecimento é o melhor investimento que você pode fazer.',
    category: 'Educação'
  },
  {
    id: 13,
    emoji: '⏰',
    text: 'O tempo é seu maior aliado nos investimentos. Comece cedo a aproveite os juros compostos.',
    category: 'Investimento'
  },
  {
    id: 14,
    emoji: '🔍',
    text: 'Revise assinaturas mensais. Muitas vezes pagamos por serviços que não usamos mais.',
    category: 'Economia'
  },
  {
    id: 15,
    emoji: '🎯',
    text: 'Estabeleça metas SMART: Específicas, Mensuráveis, Atingíveis, Relevantes e Temporais.',
    category: 'Metas'
  }
];

const getRandomTip = () => {
  const randomIndex = Math.floor(Math.random() * DAILY_TIPS.length);
  return DAILY_TIPS[randomIndex];
};

const getInitials = (name: string | null | undefined): string => {
  if (!name) return 'U';
  const names = name.split(' ');
  const initials = names.map(n => n[0]).join('');
  return initials.substring(0, 2).toUpperCase();
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

// Lista de emojis para o select
const EMOJI_OPTIONS = [
  { value: '🏠', label: 'Casa' },
  { value: '🚗', label: 'Carro' },
  { value: '✈️', label: 'Viagem' },
  { value: '🎓', label: 'Educação' },
  { value: '💍', label: 'Casamento' },
  { value: '📱', label: 'Tecnologia' },
  { value: '🏥', label: 'Saúde' },
  { value: '🎮', label: 'Entretenimento' },
  { value: '👶', label: 'Família' },
  { value: '💼', label: 'Negócios' },
  { value: '🎯', label: 'Objetivo' },
  { value: '💰', label: 'Dinheiro' },
  { value: '🏖️', label: 'Férias' },
  { value: '🎁', label: 'Presente' },
  { value: '📈', label: 'Investimentos' }
];

const QuickActionButton = ({ href, icon: Icon, title, description }: any) => (
    <motion.div
        whileHover={{ y: -5, scale: 1.03 }}
        transition={{ type: 'spring', stiffness: 300 }}
    >
        <Link href={href} className={styles.actionCard}>
            <div className={styles.actionIconWrapper}>
                <Icon size={22} />
            </div>
            <div className={styles.hoverInfo}>
                <h4 className={styles.actionTitle}>{title}</h4>
                <p className={styles.actionDescription}>{description}</p>
            </div>
        </Link>
  </motion.div>
);

// Componente de Dica do Dia
const DailyTip = () => {
  const [currentTip, setCurrentTip] = useState(getRandomTip());
  const [isVisible, setIsVisible] = useState(true);

  const handleNewTip = () => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentTip(getRandomTip());
      setIsVisible(true);
    }, 300);
  };

  return (
    <motion.div 
      className={styles.tipCard}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.tipHeader}>
        <span className={styles.tipEmoji}>{currentTip.emoji}</span>
        <div className={styles.tipTitle}>
          <strong>Dica do dia</strong>
          <span className={styles.tipCategory}>{currentTip.category}</span>
        </div>
        <motion.button 
          className={styles.newTipButton}
          onClick={handleNewTip}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Nova dica"
        >
          🔄
        </motion.button>
      </div>
      <motion.p
        key={currentTip.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={styles.tipText}
      >
        {currentTip.text}
      </motion.p>
    </motion.div>
  );
};

const HeroSection = ({ user, totalBalance, income, expense }: { user: User, totalBalance: number, income: number, expense: number }) => {
  const heroRef = useRef<HTMLElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    heroRef.current.style.setProperty('--mouse-x', `${x}px`);
    heroRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <motion.section 
      ref={heroRef}
      onMouseMove={handleMouseMove}
      className={styles.hero}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className={styles.heroGreeting}>
        <div className={styles.heroAvatarContainer}>
          {user.photoURL ? (
            <Image src={user.photoURL} alt="Foto do usuário" width={56} height={56} className={styles.avatarImage} />
          ) : (
            <div className={styles.avatarFallback}>{getInitials(user.displayName)}</div>
          )}
        </div>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            {getGreeting()}, {user.displayName || 'Usuário'}!
            <motion.span 
              className={styles.wavingHand} 
              animate={{ rotate: [0, 14, -8, 14, 0] }} 
              transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatDelay: 4 }}
            >
                👋
            </motion.span>
          </h1>
          <p className={styles.heroSubtitle}>
            Seja bem-vindo(a) de volta ao seu painel financeiro.
          </p>
        </div>
      </div>

      <div className={styles.heroBalance}>
        <div className={styles.balanceLabel}>Seu Saldo Atual</div>
        <h2 className={styles.balanceValue}>
          {Number.isFinite(totalBalance) ? totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
        </h2>
        <div className={styles.miniBalanceRow}>
            <div className={styles.miniBalanceCard}>
                <TrendingUp size={16} color="var(--positive)" />
                <div className={styles.cardValuePositive}>
                    {income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
            </div>
            <div className={styles.miniBalanceCard}>
                <TrendingDown size={16} color="var(--negative)" />
                <div className={styles.cardValueNegative}>
                    {expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
            </div>
        </div>
      </div>
    </motion.section>
  );
};

// Componentes de Modal (mantidos iguais)
const NewGoalModal = ({ isOpen, onClose, onGoalCreated }: { isOpen: boolean, onClose: () => void, onGoalCreated: (goal: Goal) => void }) => {
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount || !auth.currentUser) return;

    setLoading(true);
    try {
      const goalData = {
        title,
        targetAmount: parseFloat(targetAmount),
        currentAmount: 0,
        emoji,
        isCompleted: false,
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, `users/${auth.currentUser.uid}/goals`), goalData);
      onGoalCreated({ id: docRef.id, ...goalData });
      setTitle('');
      setTargetAmount('');
      setEmoji('🎯');
      onClose();
    } catch (error) {
      console.error('Erro ao criar meta:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <motion.div 
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div className={styles.modalHeader}>
          <h3>Criar Nova Meta</h3>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label>Emoji</label>
            <select
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className={styles.emojiSelect}
            >
              {EMOJI_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value} {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Título da Meta</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Viagem para Europa"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Valor Desejado (R$)</label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="0,00"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className={styles.confirmButton}>
              {loading ? 'Criando...' : 'Criar Meta'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const AddFundsModal = ({ isOpen, onClose, goalId, goals, onFundsAdded }: { 
  isOpen: boolean, 
  onClose: () => void, 
  goalId: string | null, 
  goals: Goal[],
  onFundsAdded: () => void 
}) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const goal = goals.find(g => g.id === goalId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !goalId || !auth.currentUser) return;

    setLoading(true);
    try {
      const goalRef = doc(db, `users/${auth.currentUser.uid}/goals`, goalId);
      const newAmount = goal!.currentAmount + parseFloat(amount);
      
      await updateDoc(goalRef, {
        currentAmount: newAmount,
        isCompleted: newAmount >= goal!.targetAmount
      });

      // Também criar uma transação de investimento
      await addDoc(collection(db, `users/${auth.currentUser.uid}/transactions`), {
        type: 'investment',
        amount: parseFloat(amount),
        description: `Investimento na meta: ${goal!.title}`,
        category: 'Investimentos',
        date: new Date(),
        createdAt: new Date()
      });

      setAmount('');
      onFundsAdded();
      onClose();
    } catch (error) {
      console.error('Erro ao adicionar fundos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !goal) return null;

  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);

  return (
    <div className={styles.modalOverlay}>
      <motion.div 
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div className={styles.modalHeader}>
          <h3>Adicionar Fundos</h3>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.goalInfo}>
          <div className={styles.goalHeader}>
            <span className={styles.emoji}>{goal.emoji}</span>
            <span className={styles.title}>{goal.title}</span>
          </div>
          <div className={styles.progressInfo}>
            <span>{goal.currentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de {goal.targetAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label>Valor para Adicionar (R$)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              min="0.01"
              step="0.01"
              required
            />
          </div>

          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className={styles.confirmButton}>
              {loading ? 'Adicionando...' : 'Adicionar Fundos'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [dashboardData, setDashboardData] = useState<any>({ totalBalance: 0, income: 0, expense: 0 });
  
  // Estados para controlar os modais
  const [isNewGoalModalOpen, setIsNewGoalModalOpen] = useState(false);
  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const transQuery = query(collection(db, `users/${user.uid}/transactions`), orderBy('date', 'desc'));
    const unsubTrans = onSnapshot(transQuery, (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        setAllTransactions(transactions);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let totalBalance = 0;
        let monthlyIncome = 0;
        let monthlyExpense = 0;

        transactions.forEach(t => {
            const amount = Number(t.amount) || 0;
            if (t.type === 'income') {
                totalBalance += amount;
            } else {
                totalBalance -= amount;
            }
            const transactionDate = t.date.toDate();
            if (transactionDate >= startOfMonth) {
                if (t.type === 'income') monthlyIncome += amount;
                else monthlyExpense += amount;
            }
        });
        setDashboardData({ totalBalance, income: monthlyIncome, expense: monthlyExpense });
    });

    const goalsQuery = query(collection(db, `users/${user.uid}/goals`));
    const unsubGoals = onSnapshot(goalsQuery, (snapshot) => {
        setAllGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal)));
    });

    return () => { unsubTrans(); unsubGoals(); };
  }, [user]);

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  };

  const handleGoalCreated = (newGoal: Goal) => {
    // A lista de metas será atualizada automaticamente pelo onSnapshot
    setIsNewGoalModalOpen(false);
  };

  const handleFundsAdded = () => {
    // A lista de metas será atualizada automaticamente pelo onSnapshot
    setIsAddFundsModalOpen(false);
    setSelectedGoalId(null);
  };

  if (loading) return <div className={styles.loading}>Carregando...</div>;
  if (!user) return <div className={styles.loading}>Faça login para ver o dashboard.</div>;

  return (
    <div className={styles.pageWrap}>
      <Header />
      <main className={styles.container}>
        <HeroSection user={user} totalBalance={dashboardData.totalBalance} income={dashboardData.income} expense={dashboardData.expense} />

        <motion.div 
            className={styles.mainGrid}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
          <div className={styles.mainColumn}>
            <motion.section variants={itemVariants}>
              <h3 className={styles.sectionTitle}>Ações Rápidas</h3>
              <div className={styles.actionsGrid}>
                <QuickActionButton href="/dashboard?modal=transaction" icon={Plus} title="Nova Transação" description="Adicione receitas ou despesas"/>
                <QuickActionButton href="/dashboard" icon={LayoutDashboard} title="Dashboard Completo" description="Visão detalhada e relatórios"/>
                <QuickActionButton href="/dashboard?modal=investment" icon={TrendingUp} title="Adicionar Investimento" description="Faça seu dinheiro render"/>
              </div>
            </motion.section>

            <motion.section variants={itemVariants}>
              <div className={styles.sectionHeaderWithLink}>
                <h3 className={styles.sectionTitle}>Insights do Mês</h3>
                <Link href="/dashboard" className={styles.sectionLink}>Ver todos <ArrowRight size={14} /></Link>
              </div>
              <PieChartCard transactions={allTransactions} />
              <p className={styles.monthInsightText}>
                {allTransactions.length === 0 ? 'Adicione transações para ver insights.' : 'Continue monitorando seus gastos para atingir suas metas.'}
              </p>
              <DailyTip />
            </motion.section>
          </div>

          <aside className={styles.sidebarColumn}>
            <motion.div variants={itemVariants}>
              <RecentActivity transactions={allTransactions} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <GoalsPreview
                goals={allGoals}
                onAddNewGoal={() => setIsNewGoalModalOpen(true)}
                onAddFunds={(goalId) => {
                  setSelectedGoalId(goalId);
                  setIsAddFundsModalOpen(true);
                }}
              />
            </motion.div>
          </aside>
        </motion.div>
      </main>

      {/* Modais */}
      <NewGoalModal 
        isOpen={isNewGoalModalOpen}
        onClose={() => setIsNewGoalModalOpen(false)}
        onGoalCreated={handleGoalCreated}
      />
      
      <AddFundsModal
        isOpen={isAddFundsModalOpen}
        onClose={() => {
          setIsAddFundsModalOpen(false);
          setSelectedGoalId(null);
        }}
        goalId={selectedGoalId}
        goals={allGoals}
        onFundsAdded={handleFundsAdded}
      />
    </div>
  );
}