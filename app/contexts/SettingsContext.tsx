"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../lib/firebase";

// 1. Definição da Interface Completa (Tipagem)
export interface Settings {
  // --- GERAL ---
  language: string;
  currency: string;
  dateFormat: string;
  startOfWeek: "sunday" | "monday";
  numberFormat: "dot" | "comma";

  // --- APARÊNCIA ---
  theme: string; // 'light', 'dark', 'system'
  reducedMotion: boolean;
  compactMode: boolean;
  blurValues: boolean; // Privacidade visual

  // --- NOTIFICAÇÕES ---
  emailNotifications: boolean;
  pushNotifications: boolean;
  spendingAlerts: boolean;
  weeklyReports: boolean;
  billReminderDays: number;

  // --- PRIVACIDADE ---
  profileVisibility: string;
  dataSharing: boolean;
  twoFactorAuth: boolean;
  sessionTimeout: string;
  autoLogout: boolean;

  // --- FINANCEIRO ---
  defaultMethod: "credit" | "debit" | "cash";
  dailyLimit: number;
  roundAmounts: boolean;

  // --- PREFERÊNCIAS EXTRAS ---
  defaultView: string;

  // Metadados
  lastUpdated?: any;
}

interface ExchangeRates {
  [key: string]: number;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  loading: boolean;
  error: string | null;
  convertCurrency: (
    amount: number,
    fromCurrency?: string,
    toCurrency?: string,
  ) => number;
  formatCurrency: (amount: number, currency?: string) => string;
  exchangeRates: ExchangeRates;
}

// 2. Configurações Padrão (Valores Iniciais)
const DEFAULT_SETTINGS: Settings = {
  // Geral
  language: "pt-BR",
  currency: "BRL",
  dateFormat: "dd/MM/yyyy",
  startOfWeek: "monday",
  numberFormat: "comma",

  // Aparência
  theme: "system",
  reducedMotion: false,
  compactMode: false,
  blurValues: false,

  // Notificações
  emailNotifications: true,
  pushNotifications: false,
  spendingAlerts: true,
  weeklyReports: false,
  billReminderDays: 3,

  // Privacidade
  profileVisibility: "private",
  dataSharing: false,
  twoFactorAuth: false,
  sessionTimeout: "30",
  autoLogout: true,

  // Financeiro
  defaultMethod: "credit",
  dailyLimit: 0,
  roundAmounts: false,

  // Outros
  defaultView: "dashboard",
};

// 3. Taxas de Câmbio Simuladas (AQUI ESTAVA FALTANDO)
const MOCK_EXCHANGE_RATES: ExchangeRates = {
  BRL: 1,
  USD: 0.19, // 1 Real = ~0.19 Dólares
  EUR: 0.18, // 1 Real = ~0.18 Euros
  GBP: 0.15, // 1 Real = ~0.15 Libras
  JPY: 28.55, // 1 Real = ~28.55 Ienes
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [exchangeRates] = useState<ExchangeRates>(MOCK_EXCHANGE_RATES);

  // --- LÓGICA DE TEMA (SISTEMA / DARK / LIGHT) ---
  const getResolvedTheme = (themePreference: string): "light" | "dark" => {
    if (themePreference === "system") {
      if (typeof window !== "undefined" && window.matchMedia) {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }
      return "dark";
    }
    return themePreference as "light" | "dark";
  };

  const applySettings = (settingsToApply: Settings) => {
    if (typeof document === "undefined") return;
    const themeToApply = getResolvedTheme(settingsToApply.theme);
    document.documentElement.setAttribute("data-theme", themeToApply);

    // Aplicar Blur Globalmente se necessário
    if (settingsToApply.blurValues) {
      document.documentElement.classList.add("privacy-blur");
    } else {
      document.documentElement.classList.remove("privacy-blur");
    }
  };

  // Listener para mudança de tema do SO
  useEffect(() => {
    if (settings.theme === "system" && typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applySettings(settings);
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [settings.theme]);

  // --- CONVERSÃO DE MOEDA ---
  const convertCurrency = (
    amount: number,
    fromCurrency: string = "BRL",
    toCurrency: string = settings.currency,
  ): number => {
    if (fromCurrency === toCurrency) return amount;
    // Se não tiver taxa, retorna o valor original
    if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency])
      return amount;

    // Converte para BRL (Base) e depois para o destino
    // Ex: USD -> BRL -> EUR
    // (Valor / TaxaUSD) * TaxaEUR ?? Não, lógica simplificada assumindo base BRL:
    // Se Base é BRL=1, USD=0.19. Então 1 USD = 1/0.19 BRL.

    const amountInBRL = amount / exchangeRates[fromCurrency];
    return Number((amountInBRL * exchangeRates[toCurrency]).toFixed(2));
  };

  const formatCurrency = (
    amount: number,
    currency: string = settings.currency,
  ): string => {
    // Apenas formatação visual, não converte valor aqui
    return amount.toLocaleString(settings.language, {
      style: "currency",
      currency: currency,
    });
  };

  // --- CARREGAMENTO DO FIRESTORE ---
  const loadSettingsFromFirestore = async (user: User) => {
    try {
      setLoading(true);
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().settings) {
        const loadedSettings = {
          ...DEFAULT_SETTINGS,
          ...userDoc.data().settings,
        };
        setSettings(loadedSettings);
        applySettings(loadedSettings);
      } else {
        await setDoc(
          userDocRef,
          { settings: DEFAULT_SETTINGS },
          { merge: true },
        );
        setSettings(DEFAULT_SETTINGS);
        applySettings(DEFAULT_SETTINGS);
      }
    } catch (err: any) {
      console.error(err);
      const saved = localStorage.getItem("userSettings");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        applySettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } finally {
      setLoading(false);
    }
  };

  // Listener Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) loadSettingsFromFirestore(user);
      else {
        const saved = localStorage.getItem("userSettings");
        if (saved) {
          const parsed = JSON.parse(saved);
          setSettings(parsed);
          applySettings(parsed);
        }
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Listener Realtime Settings
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
      if (docSnap.exists() && docSnap.data().settings) {
        const remoteSettings = docSnap.data().settings;
        if (JSON.stringify(remoteSettings) !== JSON.stringify(settings)) {
          const newSettings = { ...DEFAULT_SETTINGS, ...remoteSettings };
          setSettings(newSettings);
          applySettings(newSettings);
        }
      }
    });
    return () => unsub();
  }, [currentUser]);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      const updated = { ...settings, ...newSettings, lastUpdated: new Date() };
      setSettings(updated);
      applySettings(updated);

      if (currentUser) {
        await updateDoc(doc(db, "users", currentUser.uid), {
          settings: updated,
        });
      }
      localStorage.setItem("userSettings", JSON.stringify(updated));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const resetSettings = async () => {
    await updateSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        loading,
        error,
        convertCurrency,
        formatCurrency,
        exchangeRates,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined)
    throw new Error("useSettings must be used within a SettingsProvider");
  return context;
};
