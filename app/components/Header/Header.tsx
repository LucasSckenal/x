"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Sun,
  Moon,
  User,
  LogOut,
  Menu,
  X,
  Search,
  Settings,
  UserCircle,
  ChevronDown,
  Bell,
  Clock,
  Repeat,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";
import { auth, db, loginWithGoogle, logout } from "../../lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Header.module.scss";

// ----- TIPOS E UTILITÁRIOS -----
interface FirebaseTransaction {
  id: string;
  description?: string;
  amount?: number;
  category?: string;
  date?: any;
  recurring?: boolean;
  recurringFrequency?: "daily" | "weekly" | "monthly" | "yearly";
  recurringEndDate?: any;
  isActive?: boolean;
  recurringId?: string;
  nextDueDate?: any;
}

// Interface para dados do usuário do Firestore
interface UserData {
  photoURL?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  address?: string;
}

const DateUtils = {
  timestampToLocalDate: (timestamp: any): Date => {
    if (!timestamp) return new Date();
    try {
      if (timestamp.toDate && typeof timestamp.toDate === "function") {
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
  formatDateForDisplay: (date: Date) => date.toLocaleDateString("pt-BR"),
};

class RecurringPaymentService {
  static calculateNextDueDate(
    startDate: Date,
    frequency: string,
    endDate?: Date,
  ): Date {
    const nextDate = new Date(startDate);
    const today = new Date();
    nextDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (endDate && today > endDate) return endDate;

    let guard = 0;
    while (nextDate <= today && guard < 1000) {
      guard++;
      switch (frequency) {
        case "daily":
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case "weekly":
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case "monthly":
          const original = startDate.getDate();
          nextDate.setMonth(nextDate.getMonth() + 1);
          const lastDay = new Date(
            nextDate.getFullYear(),
            nextDate.getMonth() + 1,
            0,
          ).getDate();
          nextDate.setDate(Math.min(original, lastDay));
          break;
        case "yearly":
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
    if (days === 0) return "vence hoje";
    if (days === 1) return "vence amanhã";
    if (days < 0)
      return `vencido há ${Math.abs(days)} dia${Math.abs(days) > 1 ? "s" : ""}`;
    return `em ${days} dia${days > 1 ? "s" : ""}`;
  }
}

// ----- HEADER ----- //
export default function Header() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);

  // notificações
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  // Buscar dados do usuário do Firestore
  const fetchUserData = useCallback(async (uid: string) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data() as UserData;
        setUserData(data);

        // Prioridade: Firestore photoURL > Auth photoURL
        if (data.photoURL) {
          console.log(
            "Usando foto do Firestore (base64):",
            data.photoURL.substring(0, 50) + "...",
          );
          setUserPhotoUrl(data.photoURL);
        } else {
          // Se não tiver no Firestore, tenta pegar do Auth
          const authUser = auth.currentUser;
          if (authUser?.photoURL) {
            console.log("Usando foto do Auth:", authUser.photoURL);
            setUserPhotoUrl(authUser.photoURL);
          } else {
            setUserPhotoUrl(null);
          }
        }
      } else {
        setUserData(null);
        const authUser = auth.currentUser;
        setUserPhotoUrl(authUser?.photoURL || null);
      }
    } catch (error) {
      console.error("Erro ao buscar dados do usuário:", error);
      setUserData(null);
      const authUser = auth.currentUser;
      setUserPhotoUrl(authUser?.photoURL || null);
    }
  }, []);

  // Lógica de Notificações
  const fetchAndComputeNotifications = useCallback(async (uid: string) => {
    try {
      const q = query(collection(db, `users/${uid}/transactions`));
      const snap = await getDocs(q);
      const txs: FirebaseTransaction[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      const computed: any[] = [];
      for (const tx of txs) {
        if (
          !tx ||
          !tx.recurring ||
          !tx.recurringFrequency ||
          tx.isActive === false
        )
          continue;
        const startDate = tx.date
          ? DateUtils.timestampToLocalDate(tx.date)
          : new Date();
        const endDate = tx.recurringEndDate
          ? DateUtils.timestampToLocalDate(tx.recurringEndDate)
          : undefined;
        const nextDue = RecurringPaymentService.calculateNextDueDate(
          startDate,
          tx.recurringFrequency!,
          endDate,
        );

        if (RecurringPaymentService.shouldNotify(nextDue, 3)) {
          const days = RecurringPaymentService.getDaysUntilDue(nextDue);
          computed.push({
            id: `notif_${tx.id}_${nextDue.getTime()}`,
            transactionId: tx.id,
            description: tx.description || "Transação recorrente",
            amount: tx.amount || 0,
            category: tx.category || "Outros",
            dueDate: nextDue,
            frequency: tx.recurringFrequency,
            daysUntilDue: days,
          });
        }
      }
      computed.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

      const stored = JSON.parse(
        localStorage.getItem("recurringNotifications") || "[]",
      );
      const newOnes = computed.filter(
        (n) => !stored.some((s: any) => s.id === n.id),
      );

      if (newOnes.length > 0) {
        const merged = [...newOnes, ...stored];
        localStorage.setItem("recurringNotifications", JSON.stringify(merged));
      }

      const finalStored = JSON.parse(
        localStorage.getItem("recurringNotifications") || "[]",
      );
      setNotifications(finalStored);
      setUnreadCount(finalStored.length);
    } catch (error) {
      console.error("Erro ao buscar transações:", error);
    }
  }, []);

  // Escutar mudanças no perfil do usuário
  useEffect(() => {
    const handleProfileUpdate = () => {
      if (user?.uid) {
        console.log("Perfil atualizado, buscando novos dados...");
        fetchUserData(user.uid);
      }
    };

    window.addEventListener("userProfileUpdated", handleProfileUpdate);

    return () => {
      window.removeEventListener("userProfileUpdated", handleProfileUpdate);
    };
  }, [user, fetchUserData]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth state changed:", currentUser?.uid);
      setUser(currentUser);
      if (currentUser?.uid) {
        await fetchUserData(currentUser.uid);
        await fetchAndComputeNotifications(currentUser.uid);
      } else {
        setUserData(null);
        setUserPhotoUrl(null);
      }
    });
    return () => unsub();
  }, [fetchUserData, fetchAndComputeNotifications]);

  const markAsRead = (id: string) => {
    const stored = JSON.parse(
      localStorage.getItem("recurringNotifications") || "[]",
    );
    const updated = stored.filter((n: any) => n.id !== id);
    localStorage.setItem("recurringNotifications", JSON.stringify(updated));
    setNotifications(updated);
    setUnreadCount(updated.length);
  };

  const markAllAsRead = () => {
    localStorage.setItem("recurringNotifications", JSON.stringify([]));
    setNotifications([]);
    setUnreadCount(0);
  };

  // Theme e click outside
  useEffect(() => {
    const saved =
      (localStorage.getItem("theme") as "light" | "dark") || "light";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getUserDisplayName = () => {
    return user?.displayName || userData?.displayName || "Usuário";
  };

  const getUserInitial = () => {
    const name = getUserDisplayName();
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className={styles.headerWrapper}>
      <header className={styles.header}>
        {/* ESQUERDA: Logo + Botão Mobile */}
        <div className={styles.left}>
          <button
            className={styles.mobileBtn}
            onClick={() => {
              setMobileOpen((prev) => !prev);
              window.dispatchEvent(new CustomEvent("toggle-sidebar"));
            }}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className={styles.brandContainer}>
            <Image
              src="/icon0.png"
              alt="Orion Logo"
              width={32}
              height={32}
              priority
            />
            <span className={styles.brandName}>
              <span style={{ color: "#4f46e5" }}>Orion</span>.App
            </span>
          </div>
        </div>

        {/* CENTRO: Vazio ou apenas espaçamento flex */}
        <div className={styles.center}></div>

        {/* DIREITA: Ações */}
        <div className={styles.right}>
          {/* Botão de Busca (Circular) */}
          <button className={styles.iconBtn} aria-label="Buscar">
            <Search size={20} />
          </button>

          {/* Notificações (Circular com Badge) */}
          <div className={styles.notificationWrapper} ref={notificationsRef}>
            <button
              className={`${styles.iconBtn} ${
                unreadCount > 0 ? styles.hasUnread : ""
              }`}
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className={styles.badge}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className={styles.notificationsPanel}
                >
                  <div className={styles.notificationsHeader}>
                    <h4>Notificações</h4>
                    <button
                      onClick={markAllAsRead}
                      disabled={!notifications.length}
                    >
                      Limpar
                    </button>
                  </div>
                  <div className={styles.notificationsList}>
                    {notifications.length === 0 ? (
                      <div className={styles.emptyState}>
                        Sem novas notificações
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={styles.notificationItem}>
                          <div className={styles.notifIcon}>
                            <Clock size={14} />
                          </div>
                          <div className={styles.notifContent}>
                            <p>{n.description}</p>
                            <span>
                              {RecurringPaymentService.formatDueLabel(
                                new Date(n.dueDate),
                              )}
                            </span>
                          </div>
                          <button onClick={() => markAsRead(n.id)}>
                            <X size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Botão Carteira (Pílula) */}
          <Link href="/wallet" className={styles.walletBtn}>
            <Wallet size={18} />
            <span>Wallet</span>
          </Link>

          {/* Avatar do Usuário */}
          <div className={styles.userArea}>
            {user ? (
              <Link href="/profile" className={styles.avatarBtn}>
                {userPhotoUrl ? (
                  <div className={styles.avatarImage}>
                    <img
                      src={userPhotoUrl}
                      alt="User Avatar"
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        objectFit: "cover",
                        display: "block",
                      }}
                      onError={(e) => {
                        // Fallback se a imagem não carregar
                        console.error("Erro ao carregar imagem:", userPhotoUrl);
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = document.createElement("div");
                          fallback.className = styles.avatarFallback;
                          fallback.textContent = getUserInitial();
                          parent.appendChild(fallback);
                        }
                      }}
                      onLoad={() => {
                        console.log("Imagem carregada com sucesso");
                      }}
                    />
                  </div>
                ) : (
                  <div className={styles.avatarFallback}>
                    {getUserInitial()}
                  </div>
                )}
              </Link>
            ) : (
              <button
                className={styles.loginBtn}
                onClick={() => loginWithGoogle()}
              >
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
