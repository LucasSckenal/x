// components/RiskAnalysis/RiskAnalysis.tsx
'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Shield, TrendingUp, Clock } from 'lucide-react';
import styles from './RiskAnalysis.module.scss';

interface RiskAnalysisProps {
  investments: any[];
  totalValue: number;
}

export default function RiskAnalysis({ investments, totalValue }: RiskAnalysisProps) {
  const riskLevels = {
    'Renda Fixa': 1,
    'Fundo Imobiliário': 2,
    'ETF': 3,
    'Ações': 4,
    'Cripto': 5,
    'Outro': 3
  };

  const calculateRiskScore = () => {
    if (!investments.length) return 0;
    
    const weightedRisk = investments.reduce((sum, inv) => {
      const risk = riskLevels[inv.type] || 3;
      return sum + (risk * (inv.value / totalValue));
    }, 0);
    
    return Math.min(weightedRisk, 5);
  };

  const riskScore = calculateRiskScore();
  const riskPercentage = (riskScore / 5) * 100;

  const getRiskLevel = (score: number) => {
    if (score <= 1.5) return { level: 'Baixo', color: '#16a34a', description: 'Perfil Conservador' };
    if (score <= 2.5) return { level: 'Moderado', color: '#f59e0b', description: 'Perfil Moderado' };
    if (score <= 3.5) return { level: 'Alto', color: '#ea580c', description: 'Perfil Arrojado' };
    return { level: 'Muito Alto', color: '#dc2626', description: 'Perfil Especulativo' };
  };

  const riskInfo = getRiskLevel(riskScore);

  const diversificationScore = () => {
    const types = new Set(investments.map(inv => inv.type)).size;
    return Math.min((types / Object.keys(riskLevels).length) * 100, 100);
  };

  return (
    <div className={styles.riskAnalysis}>
      <div className={styles.riskHeader}>
        <div className={styles.riskTitle}>
          <Shield size={20} />
          <span>Análise de Risco</span>
        </div>
        <div className={styles.riskLevel} style={{ color: riskInfo.color }}>
          {riskInfo.level}
        </div>
      </div>

      <div className={styles.riskMeter}>
        <div className={styles.meterLabels}>
          <span>Conservador</span>
          <span>Especulativo</span>
        </div>
        <div className={styles.meterTrack}>
          <motion.div 
            className={styles.meterFill}
            style={{ backgroundColor: riskInfo.color }}
            initial={{ width: 0 }}
            animate={{ width: `${riskPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <div className={styles.riskDescription}>
          <AlertTriangle size={16} />
          <span>{riskInfo.description}</span>
        </div>
      </div>

      <div className={styles.riskMetrics}>
        <div className={styles.metric}>
          <div className={styles.metricHeader}>
            <TrendingUp size={16} />
            <span>Diversificação</span>
          </div>
          <div className={styles.metricValue}>
            {diversificationScore().toFixed(0)}%
          </div>
          <div className={styles.metricBar}>
            <motion.div 
              className={styles.metricFill}
              style={{ backgroundColor: '#3b82f6' }}
              initial={{ width: 0 }}
              animate={{ width: `${diversificationScore()}%` }}
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className={styles.metric}>
          <div className={styles.metricHeader}>
            <Clock size={16} />
            <span>Horizonte</span>
          </div>
          <div className={styles.metricValue}>
            {riskScore <= 2 ? 'Curto' : riskScore <= 3.5 ? 'Médio' : 'Longo'}
          </div>
          <div className={styles.metricInfo}>
            Recomendado: {riskScore <= 2 ? '1-2 anos' : riskScore <= 3.5 ? '3-5 anos' : '5+ anos'}
          </div>
        </div>
      </div>
    </div>
  );
}