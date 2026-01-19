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
  Target, // Ícone de Metas
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
    { name: "Metas", path: "/goals", icon: Target }, // Rota de Metas
    { name: "Extrato", path: "/transactions", icon: Receipt },
    { name: "Investimentos", path: "/investments", icon: TrendingUp },
    { name: "Configurações", path: "/settings", icon: Settings },
  ];

  return (
    <aside className={styles.sidebarContainer}>
      {/* O seu CSS novo não tem container de logo específico. 
         Se quiser adicionar a logo depois, crie uma div acima do <nav> 
         e adicione a classe no CSS. Por enquanto, mantive limpo.
      */}

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`${styles.navItem} ${isActive ? styles.active : ""}`}
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
