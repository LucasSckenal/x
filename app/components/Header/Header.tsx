'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Sun, Moon, User, LogOut, Menu, X, Search, Settings, UserCircle, ChevronDown, Bell, Clock, Repeat
} from 'lucide-react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db, loginWithGoogle, logout } from '../../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Header.module.scss';

// Tipos mínimos
interface FirebaseTransaction {
  id: string;
  description?: string;
  amount?: number;
  category?: string;
  date?: any;
  recurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurringEndDate?: any;
  isActive?: boolean;
  recurringId?: string;
  nextDueDate?: any;
}

// ----- UTILIDADES DE DATA (mesma ideia do DateUtils) -----
const DateUtils = {
  timestampToLocalDate: (timestamp: any): Date => {
    if (!timestamp) return new Date();
    try {
      // suporta Timestamp do firebase ou string/date
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        const d = timestamp.toDate();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      } else {
        const d = new Date(timestamp);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      }
    } catch {
      return new Date(timestamp);
    }
  },
  formatDateForDisplay: (date: Date) => date.toLocaleDateString('pt-BR'),
  createDateFromYMD: (y?: number, m?: number, d?: number) => new Date(y || 0, (m || 1) - 1, d || 1),
};

// ----- SERVIÇO DE RECORRÊNCIA (compacto e suficiente para o header) -----
class RecurringPaymentService {
  static calculateNextDueDate(startDate: Date, frequency: string, endDate?: Date): Date {
    const nextDate = new Date(startDate);
    const today = new Date();
    nextDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (endDate && today > endDate) return endDate;

    // avança até a próxima data no futuro (ou hoje)
    let guard = 0;
    while (nextDate <= today && guard < 1000) {
      guard++;
      switch (frequency) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'monthly':
          const original = startDate.getDate();
          nextDate.setMonth(nextDate.getMonth() + 1);
          const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
          nextDate.setDate(Math.min(original, lastDay));
          break;
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
        default:
          nextDate.setMonth(nextDate.getMonth() + 1);
      }
      if (endDate && nextDate > endDate) return endDate;
    }
    return nextDate;
  }

  static getDaysUntilDue(dueDate: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dueDate);
    d.setHours(0, 0, 0, 0);
    const diff = d.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  }

  static shouldNotify(dueDate: Date, daysBefore = 3) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const notificationDate = new Date(dueDate);
    notificationDate.setDate(dueDate.getDate() - daysBefore);
    notificationDate.setHours(0, 0, 0, 0);
    return today >= notificationDate && today <= dueDate;
  }

  static formatDueLabel(dueDate: Date) {
    const days = this.getDaysUntilDue(dueDate);
    if (days === 0) return 'vence hoje';
    if (days === 1) return 'vence amanhã';
    if (days < 0) return `vencido há ${Math.abs(days)} dia${Math.abs(days) > 1 ? 's' : ''}`;
    return `em ${days} dia${days > 1 ? 's' : ''}`;
  }
}

// ----- Header ----- //
export default function Header() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // notificações
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // fetch transactions do firestore e calcula notificações
  const fetchAndComputeNotifications = useCallback(async (uid: string) => {
    try {
      const q = query(collection(db, `users/${uid}/transactions`));
      const snap = await getDocs(q);
      const txs: FirebaseTransaction[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      const computed: any[] = [];

      for (const tx of txs) {
        try {
          if (!tx || !tx.recurring || !tx.recurringFrequency || tx.isActive === false) continue;
          const startDate = tx.date ? DateUtils.timestampToLocalDate(tx.date) : new Date();
          const endDate = tx.recurringEndDate ? DateUtils.timestampToLocalDate(tx.recurringEndDate) : undefined;
          const nextDue = RecurringPaymentService.calculateNextDueDate(startDate, tx.recurringFrequency!, endDate);
          if (RecurringPaymentService.shouldNotify(nextDue, 3)) {
            const days = RecurringPaymentService.getDaysUntilDue(nextDue);
            computed.push({
              id: `notif_${tx.id}_${nextDue.getTime()}`,
              transactionId: tx.id,
              description: tx.description || 'Transação recorrente',
              amount: tx.amount || 0,
              category: tx.category || 'Outros',
              dueDate: nextDue,
              frequency: tx.recurringFrequency,
              daysUntilDue: days,
              recurringId: tx.recurringId || null,
            });
          }
        } catch (e) {
          console.error('Erro ao processar tx para notificação', tx?.id, e);
        }
      }

      // ordena por tempo restante
      computed.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

      // compara com localStorage para descobrir o que é novo
      const stored = JSON.parse(localStorage.getItem('recurringNotifications') || '[]');
      const newOnes = computed.filter(n => !stored.some((s: any) => s.id === n.id));

      if (newOnes.length > 0) {
        // salva concatenado (novos no topo)
        const merged = [...newOnes, ...stored];
        localStorage.setItem('recurringNotifications', JSON.stringify(merged));
      }

      const finalStored = JSON.parse(localStorage.getItem('recurringNotifications') || '[]');
      setNotifications(finalStored);
      setUnreadCount(finalStored.length);
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
    }
  }, []);

  // auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.uid) {
        fetchAndComputeNotifications(currentUser.uid);
      } else {
        setNotifications([]);
        setUnreadCount(0);
        localStorage.removeItem('recurringNotifications');
      }
    });
    return () => unsub();
  }, [fetchAndComputeNotifications]);

  // refresh periódico (a cada 60 minutos)
  useEffect(() => {
    let interval: any;
    if (user?.uid) {
      interval = setInterval(() => fetchAndComputeNotifications(user.uid), 60 * 60 * 1000);
    }
    return () => clearInterval(interval);
  }, [user, fetchAndComputeNotifications]);

  // UI actions
  const markAsRead = (id: string) => {
    const stored = JSON.parse(localStorage.getItem('recurringNotifications') || '[]');
    const updated = stored.filter((n: any) => n.id !== id);
    localStorage.setItem('recurringNotifications', JSON.stringify(updated));
    setNotifications(updated);
    setUnreadCount(updated.length);
  };

  const markAllAsRead = () => {
    localStorage.setItem('recurringNotifications', JSON.stringify([]));
    setNotifications([]);
    setUnreadCount(0);
  };

  // theme
  useEffect(() => {
    const saved = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
  };

  // close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          className={styles.mobileBtn}
          onClick={() => {
            setMobileOpen(prev => !prev);
            const event = new CustomEvent('toggle-sidebar', { detail: { from: 'header' } });
            window.dispatchEvent(event);
          }}
          aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {mobileOpen ? <X /> : <Menu />}
        </button>

        <Link href="/" className={styles.brand}>Orion</Link>
      </div>

      <div className={styles.center}>
        <div className={styles.search}>
          <Search className={styles.searchIcon} size={20} />
          <input
            className={styles.searchInput}
            placeholder="Buscar transações, relatórios..."
            aria-label="Buscar transações e relatórios"
          />
        </div>
      </div>

      <div className={styles.right}>
        {/* Theme toggle */}
        <button className={styles.iconBtn} onClick={toggleTheme} aria-label="Alternar tema">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification bell + panel */}
        <div className={styles.notificationWrapper} ref={panelRef}>
          <button
            className={`${styles.bellBtn} ${unreadCount > 0 ? styles.hasUnread : ''}`}
            onClick={() => setMenuOpen(prev => !prev)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            title="Notificações de pagamentos recorrentes"
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className={styles.notificationCount}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                className={styles.notificationsPanel}
                role="dialog"
                aria-label="Painel de notificações"
              >
                <div className={styles.notificationsHeader}>
                  <div>
                    <h4>Pagamentos Recorrentes</h4>
                    <span className={styles.notificationsSubtitle}>
                      {notifications.length} notificação{notifications.length !== 1 ? 'es' : ''}
                    </span>
                  </div>
                  <div className={styles.notificationsActions}>
                    <button className={styles.clearBtn} onClick={markAllAsRead} disabled={notifications.length === 0}>
                      Limpar todas
                    </button>
                  </div>
                </div>

                <div className={styles.notificationsList}>
                  {notifications.length === 0 ? (
                    <div className={styles.empty}>
                      <div className={styles.emptyIcon}>🎉</div>
                      <div className={styles.emptyText}>Nenhuma notificação no momento</div>
                      <div className={styles.emptySubtitle}>Você será notificado sobre pagamentos futuros</div>
                    </div>
                  ) : (
                    notifications.map((n: any) => (
                      <div key={n.id} className={styles.notificationItem}>
                        <div className={styles.notificationLeft}>
                          <div className={styles.notificationIcon}>
                            <Repeat size={16} />
                          </div>
                        </div>

                        <div className={styles.notificationBody}>
                          <div className={styles.notificationTitle}>
                            {n.description}
                          </div>
                          <div className={styles.notificationMeta}>
                            <span className={styles.notificationCategory}>{n.category}</span>
                            <span className={styles.notificationAmount}>
                              {(n.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        </div>

                        <div className={styles.notificationRight}>
                          <div className={styles.dueBadge}>
                            <Clock size={12} />
                            <span>{RecurringPaymentService.formatDueLabel(new Date(n.dueDate))}</span>
                          </div>

                          <button
                            className={styles.markReadBtn}
                            title="Marcar como lida"
                            onClick={() => markAsRead(n.id)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className={styles.notificationsFooter}>
                  <small>Notificações geradas automaticamente para pagamentos recorrentes.</small>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User area */}
        <div className={styles.userArea}>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <button className={styles.loginButton} onClick={() => loginWithGoogle()}>
              <User size={16} /> Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// componente pequeno para menu do usuário (mantive local para arquivo único)
function UserMenu({ user }: { user: any }) {
  const [open, setOpen] = useState(false);
  const getInitials = (displayName: string | null = '') => {
    if (!displayName) return 'U';
    const parts = displayName.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className={styles.userMenuWrapper}>
      <button className={styles.userBtn} onClick={() => setOpen(prev => !prev)} aria-expanded={open}>
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt={user.displayName || 'Avatar'} className={styles.avatar} />
        ) : (
          <div className={styles.avatarFallback}>{getInitials(user.displayName)}</div>
        )}
        <span className={styles.userName}>{user.displayName || 'Usuário'}</span>
        <ChevronDown size={14} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className={styles.dropdown}>
            <div className={styles.dropdownHeader}>
              <p>Logado como <strong>{user.displayName || 'Usuário'}</strong></p>
            </div>
            <Link href="/profile" className={styles.dropdownItem}><UserCircle size={16} /> Perfil</Link>
            <Link href="/settings" className={styles.dropdownItem}><Settings size={16} /> Configurações</Link>
            <div className={styles.dropdownDivider} />
            <button className={styles.dropdownItem} onClick={() => { if (confirm('Deseja realmente sair?')) logout(); }}><LogOut size={16} /> Sair</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
