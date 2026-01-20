"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../lib/firebase";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  TrendingUp,
  Receipt,
  Target,
  Sparkles, // Ícone para a IA
} from "lucide-react";

import styles from "./Sidebar.module.scss";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Erro ao sair", error);
    }
  };

  const NAV_ITEMS = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Metas", path: "/goals", icon: Target },
    { name: "Extrato", path: "/transactions", icon: Receipt },
    { name: "Investimentos", path: "/investments", icon: TrendingUp },
    { name: "AI Assistant", path: "/ai", icon: Sparkles, isAi: true },
    { name: "Configurações", path: "/settings", icon: Settings },
  ];

  return (
    <aside className={styles.sidebarContainer}>
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path;

          return (
            <Link
              key={item.path}
              href={item.path}
              // Adiciona uma classe especial se for o item de IA
              className={`${styles.navItem} ${isActive ? styles.active : ""} ${item.isAi ? styles.aiItem : ""}`}
              title={item.name}
            >
              <item.icon className={styles.navIcon} />
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <button
          onClick={handleLogout}
          className={styles.logoutBtn}
          title="Sair"
        >
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
}
