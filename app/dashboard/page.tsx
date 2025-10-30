'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { 
  collection, query, onSnapshot, orderBy, where, getDocs, 
  writeBatch, Timestamp, doc, 
  addDoc, updateDoc, deleteDoc, serverTimestamp // <-- ADICIONE ESTAS
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import Link from 'next/link';

// Seus componentes
import Header from '../components/Header/Header';
import DashboardCards, { DashboardData } from '../components/DashboardCards/DashboardCards';
import TransactionsTable, {  Transaction } from '../components/TransactionsTable/TransactionsTable';
import Goals, { Goal } from '../components/Goals/Goals';
import Charts from '../components/Charts/Charts';
import Budgets from '../components/Budgets/Budgets';
import Investments, { Investment } from '../components/Investments/Investments';
import PieChartCard from '../components/PieChartCard/PieChartCard';


import styles from './Dashboard.module.scss';
import toast from 'react-hot-toast';

// Sua função de transações recorrentes
const calculateNextDueDate = (currentDate: Date, frequency: string): Date => {
    const newDate = new Date(currentDate.getTime());
    switch (frequency) {
        case "monthly": newDate.setUTCMonth(newDate.getUTCMonth() + 1); break;
        case "weekly": newDate.setUTCDate(newDate.getUTCDate() + 7); break;
        case "yearly": newDate.setUTCFullYear(newDate.getUTCFullYear() + 1); break;
        default: newDate.setUTCMonth(newDate.getUTCMonth() + 1);
    }
    return newDate;
};

function DashboardClient() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [dashboardData, setDashboardData] = useState<DashboardData>({});
    const [allGoals, setAllGoals] = useState<Goal[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [allInvestments, setAllInvestments] = useState<Investment[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [modalState, setModalState] = useState({delete: { isOpen: false, transaction: null as Transaction | null }, edit: { isOpen: false, transaction: null as Transaction | null }, create: { isOpen: false }});
    
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    
    // Obtenha os parâmetros da URL para controlar os modais
    const modalType = searchParams.get('modal');
    const transactionId = searchParams.get('id');

    const closeModal = () => router.push(pathname, { scroll: false });
    const openModal = (type: string) => router.push(`${pathname}?modal=${type}`, { scroll: false });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;
        
        const initializeData = async () => {
            const now = new Date();
            const q = query(collection(db, "recurringTransactions"), where("userId", "==", user.uid), where("nextDueDate", "<=", Timestamp.fromDate(now)));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const batch = writeBatch(db);
                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    let nextDueDate = data.nextDueDate.toDate();
                    while (nextDueDate <= now) {
                        batch.set(doc(collection(db, `users/${user.uid}/transactions`)), {
                            description: data.description, amount: data.amount, category: data.category, type: data.type, 
                            date: Timestamp.fromDate(nextDueDate), createdAt: Timestamp.now(),
                        });
                        nextDueDate = calculateNextDueDate(nextDueDate, data.frequency);
                    }
                    batch.update(docSnap.ref, { nextDueDate: Timestamp.fromDate(nextDueDate) });
                });
                await batch.commit();
            }

            const transQuery = query(collection(db, `users/${user.uid}/transactions`), orderBy('date', 'desc'));
            const goalsQuery = query(collection(db, `users/${user.uid}/goals`), orderBy('targetAmount', 'desc'));
            const investmentsQuery = query(collection(db, `users/${user.uid}/investments`), orderBy('value', 'desc'));

            const unsubscribers = [
                onSnapshot(transQuery, (snapshot) => {
                    setAllTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
                    setLoading(false); 
                }),
                onSnapshot(goalsQuery, (snapshot) => setAllGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal)))),
                onSnapshot(investmentsQuery, (snapshot) => setAllInvestments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Investment)))),
            ];
            
            return () => unsubscribers.forEach(unsub => unsub());
        };

        initializeData();
    }, [user]);

    useEffect(() => {
        const now = new Date();
        const currentMonth = now.getUTCMonth(), currentYear = now.getUTCFullYear();
        let totalBalance = 0, monthlyIncome = 0, monthlyExpenses = 0;
        allTransactions.forEach(t => {
            const amount = Number(t.amount) || 0;
            totalBalance += (t.type === 'income' ? amount : -amount);
            if (t.date?.toDate) {
                const transactionDate = t.date.toDate();
                if (transactionDate.getUTCMonth() === currentMonth && transactionDate.getUTCFullYear() === currentYear) {
                    if (t.type === 'income') monthlyIncome += amount;
                    else monthlyExpenses += amount;
                }
            }
        });
        setDashboardData({
            totalBalance, income: monthlyIncome, expenses: monthlyExpenses,
            goalsAchieved: allGoals.filter(g => g.isCompleted).length,
            investedBalance: allInvestments.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
        });
    }, [allTransactions, allGoals, allInvestments]);

    const sectionVariants = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
    };

    if (loading) return <div className={styles.loading}>Carregando...</div>;
    if (!user) return (
        <div className={styles.pageWrap}><Header /><div className={styles.loading}>Por favor, faça login para ver seu dashboard.</div></div>
    );


        const handleAddTransaction = async (transaction: Omit<Transaction, 'id'>) => {
        if (!user) return;

        try {
            // FIX: Interpreta a string "YYYY-MM-DD" como meia-noite LOCAL
            const [year, month, day] = transaction.date.split('-').map(Number);
            const localDate = new Date(year, month - 1, day); // month - 1 (JS é base 0)

            await addDoc(collection(db, `users/${user.uid}/transactions`), {
            ...transaction,
            date: Timestamp.fromDate(localDate), // Salva a data local correta
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            });
            toast.success('Transação adicionada com sucesso!');
        } catch (error) {
            console.error('Erro ao adicionar transação:', error);
            toast.error('Erro ao adicionar transação');
        }
        };


const handleEditTransaction = async (id: string, updatedData: Omit<Transaction, 'id'>) => {
if (!user) return;

try {
    // FIX: Interpreta a string "YYYY-MM-DD" como meia-noite LOCAL
    const [year, month, day] = updatedData.date.split('-').map(Number);
    const localDate = new Date(year, month - 1, day); // month - 1 (JS é base 0)

    await updateDoc(doc(db, `users/${user.uid}/transactions`, id), {
    ...updatedData,
    date: Timestamp.fromDate(localDate), // Salva a data local correta
    updatedAt: serverTimestamp(),
    });
    toast.success('Transação atualizada com sucesso!');
} catch (error) {
    console.error('Erro ao atualizar transação:', error);
    toast.error('Erro ao atualizar transação');
}
};

        const handleDeleteTransaction = async (id: string) => {
        if (!user) return;

        try {
            await deleteDoc(doc(db, `users/${user.uid}/transactions`, id));
            toast.success('Transação excluída!');
        } catch (error) {
            console.error('Erro ao excluir transação:', error);
            toast.error('Erro ao excluir transação');
        }
        };


    const handleAddInvestment = async (newInvestment: Omit<Investment, 'id'>) => {
        if (!user) {
            toast.error('Usuário não autenticado');
            return;
        }
        
        try {
            await addDoc(collection(db, `users/${user.uid}/investments`), {
            ...newInvestment,
            value: Number(newInvestment.value), // ✅ CONVERTE PARA NÚMERO
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
            });
            // O toast será mostrado pelo componente Investments
        } catch (error) {
            console.error('Erro ao adicionar investimento:', error);
            throw error;
        }
    };

    const handleDeleteInvestment = async (id: string) => {
        if (!user) return;
        
        try {
            await deleteDoc(doc(db, `users/${user.uid}/investments`, id));
        } catch (error) {
            console.error('Erro ao excluir investimento:', error);
            throw error;
        }
    };

    const handleRefreshData = async () => {
        setIsRefreshing(true);
        try {
            // Simula um refresh - você pode adicionar lógica real aqui
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('Erro ao atualizar dados:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleChangeInvestment = async (investmentId: string, updatedData: Partial<Investment>) => {
        if (!user) return;
        
        try {
            await updateDoc(doc(db, `users/${user.uid}/investments`, investmentId), {
                ...updatedData,
                updatedAt: serverTimestamp()
            });
            console.log('Investimento atualizado com sucesso');
        } catch (error) {
            console.error('Erro ao atualizar investimento:', error);
        }
    };
    
    return (
        <div className={styles.pageWrap}>
            <Header />
            <main className={styles.container}>
                <motion.div initial="initial" animate="animate" variants={{ animate: { transition: { staggerChildren: 0.08 } } }}>
                    <motion.div variants={sectionVariants} className={styles.pageHeader}>
                       
                    </motion.div>

                    <motion.div variants={sectionVariants}><DashboardCards data={dashboardData} /></motion.div>
                    
                    <div className={styles.dashboardGrid}>
                        <div className={styles.gridMain}>
                           <motion.div variants={sectionVariants} className={styles.widgetCard}><TransactionsTable
                            transactions={allTransactions.map(t => ({
                                ...t,
                                // Garante que datas do Firestore sejam legíveis no componente
                                date: t.date?.toDate ? t.date.toDate().toISOString() : t.date,
                                nextDueDate: t.nextDueDate?.toDate ? t.nextDueDate.toDate().toISOString() : t.nextDueDate,
                            }))}
                            onAddTransaction={handleAddTransaction}
                            onEditTransaction={handleEditTransaction}
                            onDeleteTransaction={handleDeleteTransaction}
                            /></motion.div>
                           <motion.div variants={sectionVariants} className={styles.widgetCard}><Investments 
                                investments={allInvestments}
                                isLoading={loading}
                                user={user}
                                onAddInvestment={handleAddInvestment} // ✅ Agora está sendo passada
                                onDeleteInvestment={handleDeleteInvestment}
                                onEditInvestment={handleChangeInvestment}
                                onRefreshData={handleRefreshData} isRefreshing={false}/></motion.div>
                           
                        </div>
                        <div className={styles.gridSidebar}>
                            <motion.div variants={sectionVariants} className={styles.widgetCard}><Charts transactions={allTransactions} /></motion.div>
                            <motion.div variants={sectionVariants} className={styles.widgetCard}><Budgets transactions={allTransactions}  /></motion.div>
                            <motion.div variants={sectionVariants} className={styles.widgetCard}><Goals goals={allGoals} /></motion.div>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className={styles.loading}>Carregando Dashboard...</div>}>
            <DashboardClient />
        </Suspense>
    );
}

function setIsRefreshing(arg0: boolean) {
    throw new Error('Function not implemented.');
}
