'use client';

import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import styles from './NotificationBell.module.scss';

export default function NotificationBell() {
  const [isEnabled, setIsEnabled] = useState(false);
  const { permission, requestPermission } = useNotifications();

  const handleToggle = async () => {
    if (permission === 'granted') {
      setIsEnabled(false);
      // Aqui você desativaria as notificações no seu sistema
    } else {
      const success = await requestPermission();
      setIsEnabled(success);
    }
  };

  return (
    <button 
      className={styles.bellButton}
      onClick={handleToggle}
      title={permission === 'granted' ? 'Notificações ativas' : 'Ativar notificações'}
    >
      {permission === 'granted' ? <Bell size={20} /> : <BellOff size={20} />}
    </button>
  );
}