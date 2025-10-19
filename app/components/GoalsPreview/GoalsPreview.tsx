'use client';

import { motion } from 'framer-motion';
import { Goal } from '../Goals/Goals'; // Importe a interface do seu arquivo Goals.tsx
import styles from './GoalsPreview.module.scss';
import { Target, PlusCircle, ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';

interface GoalsPreviewProps {
  goals: Goal[];
  onAddNewGoal: () => void;
  onAddFunds: (goalId: string) => void; 
}

export default function GoalsPreview({ goals, onAddNewGoal, onAddFunds }: GoalsPreviewProps) {
  const activeGoals = goals
    .filter(g => !g.isCompleted)
    .sort((a, b) => (b.currentAmount / b.targetAmount) - (a.currentAmount / a.targetAmount))
    .slice(0, 2);

  return (
    <div className={styles.container}>
      <div className={styles.cardHeader}>
        <h4>Suas Metas</h4>
        <div className={styles.headerActions}>
            <button 
                onClick={onAddNewGoal} 
                className={styles.createGoalButton}
                title="Criar nova meta"
            >
                <Plus size={16} />
            </button>
            <Link href="/dashboard?tab=goals" className={styles.viewAllLink}>
                Ver todas <ArrowRight size={14} />
            </Link>
        </div>
      </div>

      {activeGoals.length > 0 ? (
        <div className={styles.goalsList}>
          {activeGoals.map((goal, index) => {
            const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            return (
              <motion.div 
                key={goal.id} 
                className={styles.goalCard}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                whileHover="hover"
              >
                <div className={styles.goalContent}>
                  <div className={styles.goalHeader}>
                    <span className={styles.emoji}>{goal.emoji}</span>
                    <span className={styles.title}>{goal.title}</span>
                  </div>
                  <div className={styles.progressInfo}>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div className={styles.progressBar}>
                    <motion.div 
                      className={styles.progressFill}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
                <motion.div 
                  className={styles.goalActions}
                  onClick={() => onAddFunds(goal.id)}
                  variants={{ hover: { maxWidth: 100, opacity: 1 } }}
                  transition={{ ease: 'easeOut' }}
                >
                   <div className={styles.actionButton}>
                      <PlusCircle size={18} />
                      Adicionar
                   </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className={styles.noGoals}>
          <Target size={32} />
          <p>Dê o primeiro passo para realizar seus sonhos.</p>
          <button onClick={onAddNewGoal} className={styles.noGoalsButton}>
            Criar Primeira Meta
          </button>
        </div>
      )}
    </div>
  );
}