'use client';

import { useState, useEffect, useReducer, useMemo, useCallback } from 'react';
import { db, auth } from '../../lib/firebase';
import { collection, onSnapshot, query, addDoc, orderBy, doc, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, DollarSign, Check, Trash2, AlertTriangle, Target, Trophy, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './Goals.module.scss';
import CustomNumberInput from '../CustomNumberInput/CustomNumberInput';

// --- TIPOS E INTERFACES ---
interface Goal {
  id: string;
  title: string;
  currentAmount: number;
  targetAmount: number;
  emoji: string;
  isCompleted?: boolean;
}

const goalEmojis = [
  { emoji: '✈️', label: 'Viagem' }, { emoji: '🏠', label: 'Casa' }, { emoji: '🚗', label: 'Carro' },
  { emoji: '🎓', label: 'Educação' }, { emoji: '💻', label: 'Eletrônicos' }, { emoji: '🎁', label: 'Presente' },
  { emoji: '💰', label: 'Poupança' }, { emoji: '📈', label: 'Investimento' }, { emoji: '✨', label: 'Outro' },
];

// --- COMPONENTE PRINCIPAL ---
export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const user = auth.currentUser;

  const [isAddFundsModalOpen, setAddFundsModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const [isConfirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/goals`), orderBy('targetAmount', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const goalsData: Goal[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));
      setGoals(goalsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSaveGoal = useCallback(async (data: Omit<Goal, 'id' | 'currentAmount'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, `users/${user.uid}/goals`), {
        ...data,
        currentAmount: 0,
        targetAmount: Number(data.targetAmount),
        isCompleted: false,
      });
      setIsModalOpen(false);
      toast.success('Meta criada com sucesso!');
    } catch (error) { 
      console.error("Erro ao adicionar meta: ", error);
      toast.error('Erro ao criar meta.');
    }
  }, [user]);

  const handleAddFunds = useCallback(async (amount: number) => {
    if (!user || !selectedGoal || amount <= 0) return;
    const goalRef = doc(db, `users/${user.uid}/goals`, selectedGoal.id);
    try {
      await updateDoc(goalRef, { currentAmount: increment(amount) });
      closeAddFundsModal();
      toast.success('Valor adicionado à meta!');
    } catch (error) { 
      console.error("Erro ao adicionar fundos: ", error);
      toast.error('Erro ao adicionar valor.');
    }
  }, [user, selectedGoal]);

  const handleToggleComplete = useCallback(async (goal: Goal) => {
    if (!user) return;
    const goalRef = doc(db, `users/${user.uid}/goals`, goal.id);
    try {
      await updateDoc(goalRef, { isCompleted: !goal.isCompleted });
      toast.success(goal.isCompleted ? 'Meta reaberta!' : 'Meta concluída! 🎉');
    } catch (error) { 
      console.error("Erro ao atualizar meta: ", error);
      toast.error('Erro ao atualizar meta.');
    }
  }, [user]);

  const handleDeleteGoal = useCallback(async () => {
    if (!user || !goalToDelete) return;
    const goalRef = doc(db, `users/${user.uid}/goals`, goalToDelete.id);
    try {
      await deleteDoc(goalRef);
      closeConfirmDeleteModal();
      toast.success('Meta excluída!');
    } catch (error) { 
      console.error("Erro ao deletar meta: ", error);
      toast.error('Erro ao excluir meta.');
    }
  }, [user, goalToDelete]);
  
  const openAddFundsModal = useCallback((goal: Goal) => { 
    setSelectedGoal(goal); 
    setAddFundsModalOpen(true); 
  }, []);

  const closeAddFundsModal = useCallback(() => { 
    setSelectedGoal(null); 
    setAddFundsModalOpen(false); 
  }, []);

  const openConfirmDeleteModal = useCallback((goal: Goal) => { 
    setGoalToDelete(goal); 
    setConfirmDeleteOpen(true); 
  }, []);

  const closeConfirmDeleteModal = useCallback(() => { 
    setGoalToDelete(null); 
    setConfirmDeleteOpen(false); 
  }, []);

  const completedGoals = useMemo(() => goals.filter(goal => goal.isCompleted), [goals]);
  const activeGoals = useMemo(() => goals.filter(goal => !goal.isCompleted), [goals]);

  const totalProgress = useMemo(() => {
    if (goals.length === 0) return 0;
    const totalCurrent = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    return totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
  }, [goals]);

  const renderContent = () => {
    if (loading) return (
      <motion.p 
        className={styles.centeredMessage}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        Carregando metas...
      </motion.p>
    );
    
    if (goals.length === 0) return (
      <motion.div 
        className={styles.emptyState}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Target size={48} className={styles.emptyIcon} />
        <h3>Nenhuma meta criada</h3>
        <p>Que tal definir sua primeira meta financeira?</p>
      </motion.div>
    );

    return (
      <div className={styles.content}>
        {/* Resumo */}
        <motion.div 
          className={styles.summary}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className={styles.summaryItem}>
            <span>Metas Ativas</span>
            <strong>{activeGoals.length}</strong>
          </div>
          <div className={styles.summaryItem}>
            <span>Concluídas</span>
            <strong>{completedGoals.length}</strong>
          </div>
          <div className={styles.summaryProgress}>
            <div className={styles.progressBar}>
              <motion.div 
                className={styles.progressFill}
                initial={{ width: 0 }}
                animate={{ width: `${totalProgress}%` }}
                transition={{ delay: 0.5, duration: 1 }}
              />
            </div>
            <span>{totalProgress.toFixed(1)}% do total</span>
          </div>
        </motion.div>

        {/* Metas Ativas */}
        {activeGoals.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Metas em Andamento</h3>
            <div className={styles.goalsGrid}>
              {activeGoals.map((goal, index) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onAddFundsClick={() => openAddFundsModal(goal)}
                  onCompleteClick={() => handleToggleComplete(goal)}
                  onDeleteClick={() => openConfirmDeleteModal(goal)}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}

        {/* Metas Concluídas */}
        {completedGoals.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Metas Concluídas</h3>
            <div className={styles.goalsGrid}>
              {completedGoals.map((goal, index) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onAddFundsClick={() => openAddFundsModal(goal)}
                  onCompleteClick={() => handleToggleComplete(goal)}
                  onDeleteClick={() => openConfirmDeleteModal(goal)}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Target className={styles.headerIcon} />
          <h2>Minhas Metas</h2>
        </div>
        <motion.button 
          className={styles.addButton} 
          onClick={() => setIsModalOpen(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={18} />
          <span>Nova Meta</span>
        </motion.button>
      </div>
      
      {renderContent()}
      
      <GoalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveGoal} />
      <AddFundsModal isOpen={isAddFundsModalOpen} onClose={closeAddFundsModal} onSave={handleAddFunds} goal={selectedGoal} />
      <ConfirmDeleteGoalModal isOpen={isConfirmDeleteOpen} onClose={closeConfirmDeleteModal} onConfirm={handleDeleteGoal} goal={goalToDelete} />
    </div>
  );
}

// --- SUB-COMPONENTE: CARTÃO DE META ---
function GoalCard({ goal, onAddFundsClick, onCompleteClick, onDeleteClick, index }: { 
  goal: Goal; 
  onAddFundsClick: () => void; 
  onCompleteClick: () => void; 
  onDeleteClick: () => void;
  index: number;
}) {
  const progress = useMemo(() => {
    if (goal.targetAmount <= 0) return 0;
    return (goal.currentAmount / goal.targetAmount) * 100;
  }, [goal.currentAmount, goal.targetAmount]);

  const formatCurrency = useCallback((value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), []);

  const isCompleted = goal.isCompleted;

  return (
    <motion.div 
      className={`${styles.goalCard} ${isCompleted ? styles.completed : ''}`} 
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(139, 92, 246, 0.15)' }}
    >
      <div className={styles.cardBackground} />
      
      <div className={styles.cardHeader}>
        <div className={styles.titleGroup}>
          <span className={styles.emoji}>{goal.emoji || '🎯'}</span>
          <div>
            <h3>{goal.title}</h3>
            <div className={styles.progressText}>
              {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
            </div>
          </div>
        </div>
        
        <div className={styles.cardActions}>
          {!isCompleted && (
            <motion.button 
              className={styles.addFundsButton} 
              onClick={onAddFundsClick}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Adicionar fundos"
            >
              <DollarSign size={16} />
            </motion.button>
          )}
          
          <motion.button 
            className={`${styles.actionButton} ${styles.completeBtn}`} 
            onClick={onCompleteClick}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title={isCompleted ? "Reabrir meta" : "Concluir meta"}
          >
            {isCompleted ? <X size={16} /> : <Check size={16} />}
          </motion.button>
          
          <motion.button 
            className={`${styles.actionButton} ${styles.deleteBtn}`} 
            onClick={onDeleteClick}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Excluir meta"
          >
            <Trash2 size={16} />
          </motion.button>
        </div>
      </div>

      <div className={styles.progressSection}>
        <div className={styles.progressBarBg}>
          <motion.div 
            className={styles.progressBarFg} 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.5 + index * 0.1 }}
            data-completed={isCompleted}
          />
        </div>
        <div className={styles.percentage}>
          {progress.toFixed(0)}%
          {isCompleted && <Trophy size={14} className={styles.trophyIcon} />}
        </div>
      </div>
    </motion.div>
  );
}

// --- SUB-COMPONENTE: MODAL DE NOVA META ---
function GoalModal({ isOpen, onClose, onSave }: any) {
  const initialState = { title: '', targetAmount: '', emoji: goalEmojis[0].emoji };
  
  const formReducer = (state: any, action: any) => {
    switch (action.type) {
      case 'SET_FIELD': return { ...state, [action.payload.field]: action.payload.value };
      case 'RESET': return initialState;
      default: return state;
    }
  };
  
  const [form, dispatch] = useReducer(formReducer, initialState);
  
  const handleSubmit = (e: React.FormEvent) => { 
    e.preventDefault(); 
    
    if (!form.title.trim() || !form.targetAmount) {
      toast.error('Preencha todos os campos!');
      return;
    }

    const targetAmount = parseFloat(form.targetAmount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      toast.error('Digite um valor válido!');
      return;
    }

    onSave(form); 
    dispatch({ type: 'RESET' }); 
  };
  
  useEffect(() => { 
    if (!isOpen) dispatch({ type: 'RESET' }); 
  }, [isOpen]);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className={styles.modalBackdrop} 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className={styles.modal} 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
          >
            <div className={styles.modalHeader}>
              <h3>Criar Nova Meta</h3>
              <motion.button 
                className={styles.closeBtn} 
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={20} />
              </motion.button>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Nome da Meta</label>
                <input 
                  name="title" 
                  type="text" 
                  value={form.title} 
                  onChange={(e) => dispatch({type: 'SET_FIELD', payload: {field: 'title', value: e.target.value}})} 
                  placeholder="Ex: Viagem para o Japão" 
                  required 
                />
              </div>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Valor Total</label>
                  <CustomNumberInput
                    value={form.targetAmount}
                    onChange={(value) => dispatch({type: 'SET_FIELD', payload: {field: 'targetAmount', value}})}
                    placeholder="15000.00"
                    step={0.01}
                    min={0.01}
                    required
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Ícone</label>
                  <select 
                    name="emoji" 
                    value={form.emoji} 
                    onChange={(e) => dispatch({type: 'SET_FIELD', payload: {field: 'emoji', value: e.target.value}})}
                  >
                    {goalEmojis.map(item => (
                      <option key={item.emoji} value={item.emoji}>
                        {item.emoji} {item.label}
                      </option>
                    ))}
                  </select>
                </div>
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
                  Criar Meta
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- SUB-COMPONENTE: MODAL DE ADICIONAR FUNDOS ---
function AddFundsModal({ isOpen, onClose, onSave, goal }: { isOpen: boolean; onClose: () => void; onSave: (amount: number) => void; goal: Goal | null }) {
  const [amount, setAmount] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!isNaN(numericAmount) && numericAmount > 0) {
      onSave(numericAmount);
    } else {
      toast.error('Digite um valor válido!');
    }
  };
  
  useEffect(() => { 
    if (!isOpen) setAmount(''); 
  }, [isOpen]);

  const remainingAmount = goal ? goal.targetAmount - goal.currentAmount : 0;

  return (
    <AnimatePresence>
      {isOpen && goal && (
        <motion.div 
          className={styles.modalBackdrop} 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className={styles.modal} 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
          >
            <div className={styles.modalHeader}>
              <h3>Adicionar Fundos</h3>
              <motion.button 
                className={styles.closeBtn} 
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={20} />
              </motion.button>
            </div>
            
            <div className={styles.goalInfo}>
              <span className={styles.emoji}>{goal.emoji}</span>
              <div>
                <h4>{goal.title}</h4>
                <p>Faltam {remainingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Valor a Adicionar</label>
                <CustomNumberInput
                  value={amount}
                  onChange={setAmount}
                  placeholder="0,00"
                  step={1}
                  min={0}
                  max={remainingAmount}
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
                  Adicionar
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- SUB-COMPONENTE: MODAL DE CONFIRMAÇÃO DE EXCLUSÃO ---
function ConfirmDeleteGoalModal({ isOpen, onClose, onConfirm, goal }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; goal: Goal | null }) {
  return (
    <AnimatePresence>
      {isOpen && goal && (
        <motion.div 
          className={styles.modalBackdrop} 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className={styles.modal} 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
          >
            <div className={styles.modalHeader}>
              <h3>Confirmar Exclusão</h3>
            </div>
            
            <div className={styles.confirmContent}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <AlertTriangle size={48} className={styles.confirmIcon} />
              </motion.div>
              <p>Tem certeza que deseja excluir a meta<br /><strong>"{goal.emoji} {goal.title}"</strong>?</p>
              <span className={styles.warningText}>Esta ação não pode ser desfeita.</span>
            </div>
            
            <div className={styles.modalActions}>
              <motion.button 
                onClick={onClose} 
                className={styles.cancelButton}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancelar
              </motion.button>
              <motion.button 
                onClick={onConfirm} 
                className={styles.deleteConfirmButton}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Sim, Excluir
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}