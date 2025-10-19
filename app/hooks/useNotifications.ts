// Adicione este arquivo: hooks/useNotifications.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { RecurringNotification, NotificationService } from '../lib/notifications';
import { Transaction } from '../components/TransactionsTable/TransactionsTable';
import toast from 'react-hot-toast';

export function useNotifications(transactions: Transaction[]) {
  const [notifications, setNotifications] = useState<RecurringNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const checkForNotifications = useCallback(async () => {
    try {
      const newNotifications = await NotificationService.checkRecurringPayments(transactions);
      
      // Filtrar apenas notificações não visualizadas
      const storedNotifications = JSON.parse(
        localStorage.getItem('recurringNotifications') || '[]'
      );

      const unreadNotifications = newNotifications.filter(newNotif => 
        !storedNotifications.some((stored: RecurringNotification) => stored.id === newNotif.id)
      );

      if (unreadNotifications.length > 0) {
        setNotifications(prev => [...prev, ...unreadNotifications]);
        setUnreadCount(prev => prev + unreadNotifications.length);
        
        // Mostrar toast para cada nova notificação
        unreadNotifications.forEach(notif => {
          toast.success(
            `💡 Pagamento Recorrente: ${notif.description} vence ${NotificationService.formatDueDate(notif.dueDate)}`,
            {
              duration: 6000,
              icon: '🔔',
              position: 'top-right'
            }
          );
        });

        // Salvar no localStorage
        const allNotifications = [...storedNotifications, ...unreadNotifications];
        localStorage.setItem('recurringNotifications', JSON.stringify(allNotifications));
      }
    } catch (error) {
      console.error('Erro ao verificar notificações:', error);
    }
  }, [transactions]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    // Atualizar localStorage
    const storedNotifications = JSON.parse(
      localStorage.getItem('recurringNotifications') || '[]'
    );
    const updatedNotifications = storedNotifications.filter((n: RecurringNotification) => n.id !== notificationId);
    localStorage.setItem('recurringNotifications', JSON.stringify(updatedNotifications));
  };

  const markAllAsRead = () => {
    setNotifications([]);
    setUnreadCount(0);
    
    // Limpar apenas as notificações visualizadas do localStorage
    const storedNotifications = JSON.parse(
      localStorage.getItem('recurringNotifications') || '[]'
    );
    const activeNotifications = storedNotifications.filter((n: RecurringNotification) => 
      notifications.some(current => current.id === n.id)
    );
    // Manter apenas as notificações que não estão atualmente visíveis
    localStorage.setItem('recurringNotifications', 
      JSON.stringify(storedNotifications.filter((n: RecurringNotification) => 
        !activeNotifications.some(active => active.id === n.id)
      ))
    );
  };

  useEffect(() => {
    // Verificar notificações a cada 5 minutos
    const interval = setInterval(checkForNotifications, 5 * 60 * 1000);
    
    // Verificar imediatamente ao carregar
    checkForNotifications();

    return () => clearInterval(interval);
  }, [checkForNotifications]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    checkForNotifications
  };
}