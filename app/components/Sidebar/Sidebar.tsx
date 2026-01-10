"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../lib/firebase";
import {
  Home,
  LayoutDashboard,
  Settings,
  LogOut,
  User as UserIcon,
  Wallet,
  TrendingUp,
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

  // --- GRUPO 1: PRINCIPAL ---
  const MAIN_ITEMS = [
    { name: "Visão Geral", path: "/", icon: Home },
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Carteira", path: "/wallet", icon: Wallet },
    { name: "Investimentos", path: "/investments", icon: TrendingUp },
  ];

  // --- GRUPO 2: CONFIGURAÇÕES ---
  const CONFIG_ITEMS = [
    { name: "Perfil", path: "/profile", icon: UserIcon },
    { name: "Configurações", path: "/settings", icon: Settings },
  ];

  const userInitial = user?.displayName
    ? user.displayName[0].toUpperCase()
    : "U";

  // Função auxiliar para renderizar link
  const renderLink = (item: (typeof MAIN_ITEMS)[0]) => {
    const isActive = pathname === item.path;
    return (
      <Link
        key={item.path}
        href={item.path}
        className={`${styles.navItem} ${isActive ? styles.active : ""}`}
      >
        <item.icon className={styles.navIcon} />
        <span>{item.name}</span>
      </Link>
    );
  };

  return (
    <aside className={styles.sidebarContainer}>
      {/* LOGO */}
      <div className={styles.logo}>
        <span>
          Orion<span style={{ color: "#8257e5" }}>.App</span>
        </span>
      </div>

      {/* NAVEGAÇÃO */}
      <nav className={styles.nav}>
        {/* Renderiza Grupo Principal */}
        <div className={styles.navGroup}>
          <span className={styles.groupLabel}>Menu</span>
          {MAIN_ITEMS.map(renderLink)}
        </div>

        {/* --- AQUI ESTÁ A SEPARAÇÃO VISUAL --- */}
        <div className={styles.separator}></div>

        {/* Renderiza Grupo de Configurações */}
        <div className={styles.navGroup}>
          <span className={styles.groupLabel}>Conta</span>
          {CONFIG_ITEMS.map(renderLink)}
        </div>
      </nav>

      {/* RODAPÉ DO USUÁRIO */}
      <div className={styles.footer}>
        {user ? (
          <div className={styles.userProfile}>
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className={styles.avatarFallback}>{userInitial}</div>
            )}

            <div className={styles.userInfo}>
              <strong>{user.displayName?.split(" ")[0] || "Usuário"}</strong>
              <span title={user.email || ""}>
                {user.email?.length && user.email.length > 18
                  ? `${user.email.slice(0, 18)}...`
                  : user.email}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className={styles.logoutBtn}
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <div className={styles.loadingUser}>
            <div className={styles.skeletonAvatar}></div>
            <div className={styles.skeletonText}></div>
          </div>
        )}
      </div>
    </aside>
  );
}
