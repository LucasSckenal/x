// components/InvestmentGridCard/InvestmentGridCard.tsx
'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Star, MoreVertical, Edit3, Trash2 } from 'lucide-react';
import { useState } from 'react';
import styles from './InvestmentGridCard.module.scss';

interface InvestmentGridCardProps {
  investment: any;
  index: number;
  onEdit: (investment: any, e: React.MouseEvent) => void;
  onDelete: (investment: any, e: React.MouseEvent) => void;
  onClick: (investment: any) => void;
  onToggleFavorite: (investmentId: string, isFavorite: boolean) => void;
  getTypeColor: (type: string) => string;
  getInvestmentIcon: (type: string) => JSX.Element;
  user: any;
  formatCurrency: (value: number) => string;
}

export default function InvestmentGridCard({
  investment,
  index,
  onEdit,
  onDelete,
  onClick,
  onToggleFavorite,
  getTypeColor,
  getInvestmentIcon,
  user,
  formatCurrency
}: InvestmentGridCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Simular performance para demonstração
  const performance = Math.random() * 20 - 10; // -10% to +10%
  const isPositive = performance >= 0;

  return (
    <motion.div
      className={styles.gridCard}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ 
        scale: 1.02,
        y: -5,
        transition: { duration: 0.2 }
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => onClick(investment)}
    >
      {/* Header do Card */}
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <div 
            className={styles.typeIcon}
            style={{ 
              backgroundColor: `${getTypeColor(investment.type)}20`,
              color: getTypeColor(investment.type),
              border: `2px solid ${getTypeColor(investment.type)}30`
            }}
          >
            {getInvestmentIcon(investment.type)}
          </div>
          <div className={styles.headerInfo}>
            <h4 className={styles.investmentName}>{investment.name}</h4>
            <div className={styles.typeChip}>
              <span>{investment.type}</span>
              {investment.symbol && <span className={styles.symbol}>• {investment.symbol}</span>}
            </div>
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <motion.button
            className={`${styles.favoriteBtn} ${investment.isFavorite ? styles.favorited : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(investment.id, !investment.isFavorite);
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Star size={16} fill={investment.isFavorite ? 'currentColor' : 'none'} />
          </motion.button>
          
          <div className={styles.menuContainer}>
            <motion.button
              className={styles.menuBtn}
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <MoreVertical size={16} />
            </motion.button>
            
            {showMenu && (
              <motion.div
                className={styles.dropdownMenu}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <button onClick={(e) => {
                  e.stopPropagation();
                  onEdit(investment, e);
                  setShowMenu(false);
                }}>
                  <Edit3 size={14} />
                  Editar
                </button>
                <button onClick={(e) => {
                  e.stopPropagation();
                  onDelete(investment, e);
                  setShowMenu(false);
                }}>
                  <Trash2 size={14} />
                  Excluir
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Valor Principal */}
      <div className={styles.valueSection}>
        <motion.div 
          className={styles.mainValue}
          animate={{ scale: isHovered ? 1.05 : 1 }}
          transition={{ duration: 0.2 }}
        >
          {formatCurrency(investment.value)}
        </motion.div>
        <div className={`${styles.performanceBadge} ${isPositive ? styles.positive : styles.negative}`}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{isPositive ? '+' : ''}{performance.toFixed(1)}%</span>
        </div>
      </div>

      {/* Informações Adicionais */}
      <div className={styles.additionalInfo}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Risco</span>
          <div className={`${styles.riskLevel} ${styles[investment.riskLevel?.toLowerCase() || 'médio']}`}>
            {investment.riskLevel || 'Médio'}
          </div>
        </div>
        
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Categoria</span>
          <span className={styles.category}>{investment.type}</span>
        </div>
      </div>

      {/* Footer do Card */}
      <motion.div 
        className={styles.cardFooter}
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0.7 }}
        transition={{ duration: 0.2 }}
      >
        <div className={styles.footerStats}>
          <div className={styles.stat}>
            <span>Retorno</span>
            <span className={isPositive ? styles.positive : styles.negative}>
              {isPositive ? '+' : ''}{formatCurrency(investment.value * performance / 100)}
            </span>
          </div>
        </div>
        
        {investment.notes && (
          <div className={styles.notesPreview}>
            <span>📝 {investment.notes.slice(0, 30)}{investment.notes.length > 30 ? '...' : ''}</span>
          </div>
        )}
      </motion.div>

      {/* Efeito de brilho no hover */}
      <motion.div
        className={styles.glowEffect}
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        style={{
          background: `radial-gradient(circle at center, ${getTypeColor(investment.type)}15, transparent 70%)`
        }}
      />
    </motion.div>
  );
}