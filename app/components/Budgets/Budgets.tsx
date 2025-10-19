'use client';

import { useState, useEffect, useReducer, useMemo, useCallback } from 'react';
import { db, auth } from '../../lib/firebase';
import { collection, onSnapshot, query, addDoc, doc, updateDoc, where, getDocs, deleteDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Plus, Trash2, AlertCircle, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './Budgets.module.scss';
import { transactionCategories, Transaction } from '../TransactionsTable/TransactionsTable';
import CustomSelect from '../CustomSelect/CustomSelect';
import CustomNumberInput from '../CustomNumberInput/CustomNumberInput';
import Modal from '../Modal/Modal';

// --- TIPOS E INTERFACES ---
export interface Budget {
  id: string;
  categoryName: string;
  targetAmount: number;
}

interface BudgetsProps {
  transactions: Transaction[];
}

// --- COMPONENTE PRINCIPAL ---
export default function Budgets({ transactions }: BudgetsProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const user = auth.currentUser;

  // Busca orçamentos
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/budgets`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const budgetsData: Budget[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget));
      setBudgets(budgetsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Calcula progresso
  const budgetsWithProgress = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getUTCMonth();
    const currentYear = now.getUTCFullYear();

    return budgets.map(budget => {
      const spent = transactions
        .filter(t => 
          t.category === budget.categoryName && 
          t.type === 'expense' &&
          t.date.toDate().getUTCMonth() === currentMonth &&
          t.date.toDate().getUTCFullYear() === currentYear
        )
        .reduce((sum, t) => sum + t.amount, 0);
        
      const progress = budget.targetAmount > 0 ? (spent / budget.targetAmount) * 100 : 0;
      const isOverBudget = progress > 100;
      const isWarning = progress > 80 && progress <= 100;
      
      return { ...budget, spent, progress, isOverBudget, isWarning };
    });
  }, [budgets, transactions]);

  const handleSaveBudget = useCallback(async (data: { categoryName: string, targetAmount: number }) => {
    if (!user) return;
    const budgetData = { ...data, targetAmount: Number(data.targetAmount) };
    try {
      const q = query(collection(db, `users/${user.uid}/budgets`), where("categoryName", "==", budgetData.categoryName));
      const existing = await getDocs(q);

      if (!existing.empty && (!editingBudget || existing.docs[0].id !== editingBudget.id)) {
        toast.error('Já existe um orçamento para esta categoria!');
        return;
      }

      if (editingBudget) {
        await updateDoc(doc(db, `users/${user.uid}/budgets`, editingBudget.id), budgetData);
        toast.success('Orçamento atualizado!');
      } else {
        await addDoc(collection(db, `users/${user.uid}/budgets`), budgetData);
        toast.success('Orçamento criado!');
      }
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar orçamento.');
    }
  }, [user, editingBudget]);

  const handleDeleteBudget = useCallback(async (budgetId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/budgets`, budgetId));
      toast.success('Orçamento removido!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao remover orçamento.');
    }
  }, [user]);

  const openModal = useCallback((budget: Budget | null = null) => {
    setEditingBudget(budget);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setEditingBudget(null);
    setIsModalOpen(false);
  }, []);
  
  const formatCurrency = useCallback((value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), []);

  const totalBudget = useMemo(() => 
    budgets.reduce((sum, budget) => sum + budget.targetAmount, 0), 
    [budgets]
  );

  const totalSpent = useMemo(() => 
    budgetsWithProgress.reduce((sum, budget) => sum + budget.spent, 0), 
    [budgetsWithProgress]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Target size={20} className={styles.headerIcon} />
          <h2>Orçamentos do Mês</h2>
        </div>
        <motion.button 
          className={styles.addButton} 
          onClick={() => openModal()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={18} />
        </motion.button>
      </div>

      {/* Resumo */}
      <motion.div 
        className={styles.summary}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className={styles.summaryItem}>
          <p>Total Orçado</p>
          <h3>{formatCurrency(totalBudget)}</h3>
        </div>
        <div className={styles.summaryItem}>
          <p>Total Gasto</p>
          <h3 className={totalSpent > totalBudget ? styles.overBudget : ''}>
            {formatCurrency(totalSpent)}
          </h3>
        </div>
        <div className={styles.summaryProgress}>
          <div className={styles.progressBar}>
            <motion.div 
              className={styles.progressFill}
              initial={{ width: 0 }}
              animate={{ width: `${totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0}%` }}
              transition={{ delay: 0.5, duration: 1 }}
              data-overbudget={totalSpent > totalBudget}
            />
          </div>
          <p className={styles.progressText}>
            {totalBudget > 0 ? `${Math.round((totalSpent / totalBudget) * 100)}% utilizado` : 'Sem orçamentos'}
          </p>
        </div>
      </motion.div>

      {/* Lista de orçamentos */}
      <div className={styles.budgetList}>
        {loading && (
          <motion.p className={styles.centeredMessage} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Carregando orçamentos...
          </motion.p>
        )}
        
        {!loading && budgetsWithProgress.length === 0 && (
          <motion.p className={styles.centeredMessage} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Nenhum orçamento definido.
            <br />
            <span>Comece criando seu primeiro orçamento!</span>
          </motion.p>
        )}
        
        {budgetsWithProgress.map((b, index) => (
          <motion.div 
            key={b.id} 
            className={styles.budgetItem}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ y: -2, boxShadow: '0 8px 25px rgba(139, 92, 246, 0.15)' }}
          >
            <div className={styles.itemHeader}>
              <span className={styles.categoryName}>
                {transactionCategories.find(c => c.name === b.categoryName)?.icon} {b.categoryName}
              </span>
              <motion.button 
                className={styles.deleteButton} 
                onClick={() => handleDeleteBudget(b.id)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Trash2 size={16} />
              </motion.button>
            </div>
            
            <div className={styles.progressBarBg}>
              <motion.div 
                className={styles.progressBarFg} 
                initial={{ width: 0 }}
                animate={{ width: `${b.progress > 100 ? 100 : b.progress}%` }}
                transition={{ duration: 1, delay: 0.2 + index * 0.1 }}
                data-overbudget={b.isOverBudget}
                data-warning={b.isWarning}
              />
            </div>
            
            <div className={styles.itemFooter}>
              <div className={styles.amountInfo}>
                <span className={styles.spentAmount}>{formatCurrency(b.spent)}</span>
                <span className={styles.targetAmount}>de {formatCurrency(b.targetAmount)}</span>
              </div>
              <div className={styles.progressInfo}>
                {b.isOverBudget && <AlertCircle size={14} className={styles.warningIcon} />}
                <span className={`
                  ${styles.percentage} 
                  ${b.isOverBudget ? styles.overBudget : ''} 
                  ${b.isWarning ? styles.warning : ''}
                `}>
                  {b.progress.toFixed(0)}%
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal de criação/edição */}
      <BudgetModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        onSave={handleSaveBudget} 
        existingBudgets={budgets} 
        editingBudget={editingBudget}
      />
    </div>
  );
}

// --- SUBCOMPONENTE: MODAL DE ORÇAMENTO ---
interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { categoryName: string; targetAmount: number }) => void;
  existingBudgets: Budget[];
  editingBudget: Budget | null;
}

function BudgetModal({ isOpen, onClose, onSave, existingBudgets, editingBudget }: BudgetModalProps) {
  const availableCategories = useMemo(() => 
    transactionCategories.filter(
      cat => cat.name !== 'Salário' && 
            (!existingBudgets.some(b => b.categoryName === cat.name) || 
             (editingBudget && cat.name === editingBudget.categoryName))
    ),
    [existingBudgets, editingBudget]
  );

  const selectOptions = useMemo(() => 
    availableCategories.map(cat => ({
      value: cat.name,
      label: cat.name,
      icon: cat.icon
    })),
    [availableCategories]
  );

  const getInitialState = useCallback(() => ({
    categoryName: editingBudget?.categoryName || availableCategories[0]?.name || '', 
    targetAmount: editingBudget?.targetAmount.toString() || '' 
  }), [editingBudget, availableCategories]);
  
  const formReducer = (state: any, action: any) => {
    switch(action.type) {
      case 'SET_FIELD': 
        return { ...state, [action.payload.field]: action.payload.value };
      case 'RESET': 
        return getInitialState();
      default: 
        return state;
    }
  };
  
  const [form, dispatch] = useReducer(formReducer, getInitialState());
  
  const handleSubmit = useCallback((e: React.FormEvent) => { 
    e.preventDefault(); 
    
    if (!form.categoryName || !form.targetAmount) {
      toast.error('Preencha todos os campos!');
      return;
    }

    const targetAmount = parseFloat(form.targetAmount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      toast.error('Digite um valor válido!');
      return;
    }

    onSave({
      categoryName: form.categoryName,
      targetAmount: targetAmount
    }); 
  }, [form, onSave]);

  const handleCategoryChange = useCallback((value: string) => {
    dispatch({ type: 'SET_FIELD', payload: { field: 'categoryName', value } });
  }, []);

  const handleAmountChange = useCallback((value: string) => {
    dispatch({ type: 'SET_FIELD', payload: { field: 'targetAmount', value } });
  }, []);

  useEffect(() => { 
    if (isOpen) dispatch({ type: 'RESET' }); 
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingBudget ? 'Editar Orçamento' : 'Definir Orçamento'}>
      {availableCategories.length === 0 && !editingBudget ? (
        <p className={styles.centeredMessage}>Todos os orçamentos já foram definidos.</p>
      ) : (
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label>Categoria</label>
            <CustomSelect
              options={selectOptions}
              value={form.categoryName}
              onChange={handleCategoryChange}
              placeholder="Selecione uma categoria"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>Limite Mensal (R$)</label>
            <CustomNumberInput
              value={form.targetAmount}
              onChange={handleAmountChange}
              placeholder="0,00"
              step={1}
              min={0}
              required
            />
          </div>
          
          <div className={styles.modalActions}>
            <motion.button 
              type="button" 
              onClick={onClose} 
              className={styles.cancelButton}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Cancelar
            </motion.button>
            <motion.button 
              type="submit" 
              className={styles.saveButton}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {editingBudget ? 'Atualizar' : 'Salvar'}
            </motion.button>
          </div>
        </form>
      )}
    </Modal>
  );
}
