// contexts/SettingsContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  onSnapshot 
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';

export interface Settings {
  // Notificações
  emailNotifications: boolean;
  pushNotifications: boolean;
  transactionAlerts: boolean;
  weeklyReports: boolean;
  
  // Privacidade
  profileVisibility: string;
  dataSharing: boolean;
  
  // Aparência
  theme: string;
  language: string;
  currency: string;
  
  // Segurança
  twoFactorAuth: boolean;
  sessionTimeout: string;
  
  // Preferências
  defaultView: string;
  autoLogout: boolean;

  // Metadados
  lastUpdated?: Date;
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
  convertCurrency: (amount: number, fromCurrency?: string, toCurrency?: string) => number;
  formatCurrency: (amount: number, currency?: string) => string;
  exchangeRates: ExchangeRates;
}

// Configurações padrão
const DEFAULT_SETTINGS: Settings = {
  emailNotifications: true,
  pushNotifications: true,
  transactionAlerts: true,
  weeklyReports: false,
  profileVisibility: 'private',
  dataSharing: false,
  theme: 'light',
  language: 'pt-BR',
  currency: 'BRL',
  twoFactorAuth: false,
  sessionTimeout: '30',
  defaultView: 'dashboard',
  autoLogout: true
};

// Taxas de câmbio mockadas (em relação ao BRL como base)
const MOCK_EXCHANGE_RATES: ExchangeRates = {
  BRL: 1,       // Base
  USD: 0.19,    // 1 BRL = 0.19 USD
  EUR: 0.18,    // 1 BRL = 0.18 EUR
  GBP: 0.15,    // 1 BRL = 0.15 GBP
  JPY: 28.55,   // 1 BRL = 28.55 JPY
  CAD: 0.26,    // 1 BRL = 0.26 CAD
  AUD: 0.29,    // 1 BRL = 0.29 AUD
  CHF: 0.17,    // 1 BRL = 0.17 CHF
  CNY: 1.38,    // 1 BRL = 1.38 CNY
  INR: 15.96,   // 1 BRL = 15.96 INR
  MXN: 3.31,    // 1 BRL = 3.31 MXN
  ARS: 161.50,  // 1 BRL = 161.50 ARS
  CLP: 172.45,  // 1 BRL = 172.45 CLP
  COP: 742.30,  // 1 BRL = 742.30 COP
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(MOCK_EXCHANGE_RATES);

  // Converter moeda
  const convertCurrency = (
    amount: number, 
    fromCurrency: string = 'BRL', // Moeda padrão de entrada (assumindo que os dados são armazenados em BRL)
    toCurrency: string = settings.currency // Moeda de saída padrão é a configurada pelo usuário
  ): number => {
    if (fromCurrency === toCurrency) return amount;
    
    if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) {
      console.warn(`Taxa de câmbio não encontrada para: ${fromCurrency} ou ${toCurrency}`);
      return amount;
    }
    
    // Converter para BRL primeiro (nossa moeda base)
    const amountInBRL = amount / exchangeRates[fromCurrency];
    
    // Converter de BRL para a moeda de destino
    const convertedAmount = amountInBRL * exchangeRates[toCurrency];
    
    return Number(convertedAmount.toFixed(2));
  };

  // Formatador de moeda
  const formatCurrency = (amount: number, currency: string = settings.currency): string => {
    // Se a moeda solicitada for diferente da moeda padrão de armazenamento (BRL), converter
    let amountToFormat = amount;
    
    if (currency !== 'BRL') {
      amountToFormat = convertCurrency(amount, 'BRL', currency);
    }
    
    return amountToFormat.toLocaleString('pt-BR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Obter referência do documento do usuário no Firestore
  const getUserDocRef = () => {
    if (!currentUser) throw new Error('Usuário não autenticado');
    return doc(db, 'users', currentUser.uid);
  };

  // Carregar configurações do Firestore
  const loadSettingsFromFirestore = async (user: User) => {
    try {
      setLoading(true);
      setError(null);

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      let loadedSettings: Settings;

      if (userDoc.exists() && userDoc.data().settings) {
        // Carregar configurações existentes
        const firestoreSettings = userDoc.data().settings;
        loadedSettings = {
          ...DEFAULT_SETTINGS,
          ...firestoreSettings,
          sessionTimeout: firestoreSettings.sessionTimeout?.toString() || '30'
        };
      } else {
        // Primeiro acesso - criar documento com configurações padrão
        loadedSettings = DEFAULT_SETTINGS;
        await setDoc(userDocRef, { 
          settings: loadedSettings,
          createdAt: new Date(),
          lastLogin: new Date()
        }, { merge: true });
      }

      setSettings(loadedSettings);
      applySettings(loadedSettings);
      
    } catch (err: any) {
      console.error('Erro ao carregar configurações do Firestore:', err);
      setError(err.message);
      // Fallback para localStorage
      loadSettingsFromLocalStorage();
    } finally {
      setLoading(false);
    }
  };

  // Fallback para localStorage
  const loadSettingsFromLocalStorage = () => {
    try {
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        const loadedSettings = {
          ...DEFAULT_SETTINGS,
          ...parsedSettings,
          sessionTimeout: parsedSettings.sessionTimeout?.toString() || '30'
        };
        setSettings(loadedSettings);
        applySettings(loadedSettings);
      }
    } catch (err: any) {
      console.error('Erro ao carregar do localStorage:', err);
      setError(err.message);
    }
  };

  // Aplicar configurações no DOM
  const applySettings = (settingsToApply: Settings) => {
    document.documentElement.setAttribute('data-theme', settingsToApply.theme);
    document.documentElement.setAttribute('lang', settingsToApply.language);
    localStorage.setItem('userTheme', settingsToApply.theme);
  };

  // Ouvir mudanças de autenticação
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        loadSettingsFromFirestore(user);
      } else {
        // Usuário deslogado - usar localStorage
        setLoading(false);
        loadSettingsFromLocalStorage();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Sincronização em tempo real (opcional)
  useEffect(() => {
    if (!currentUser) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists() && docSnapshot.data().settings) {
        const firestoreSettings = docSnapshot.data().settings;
        const syncedSettings = {
          ...DEFAULT_SETTINGS,
          ...firestoreSettings,
          sessionTimeout: firestoreSettings.sessionTimeout?.toString() || '30'
        };
        
        // Evitar loop de atualização
        if (JSON.stringify(syncedSettings) !== JSON.stringify(settings)) {
          setSettings(syncedSettings);
          applySettings(syncedSettings);
        }
      }
    }, (err) => {
      console.error('Erro na sincronização em tempo real:', err);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Atualizar configurações
  const updateSettings = async (newSettings: Partial<Settings>): Promise<void> => {
    try {
      setError(null);
      const updatedSettings = { 
        ...settings, 
        ...newSettings,
        lastUpdated: new Date()
      };

      setSettings(updatedSettings);
      applySettings(updatedSettings);

      // Salvar no Firestore se usuário estiver logado
      if (currentUser) {
        const userDocRef = getUserDocRef();
        await updateDoc(userDocRef, {
          settings: updatedSettings,
          lastUpdated: new Date()
        });
      }

      // Backup no localStorage
      localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
      
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err);
      setError(err.message);
      throw err; // Re-throw para tratamento na UI
    }
  };

  // Resetar configurações
  const resetSettings = async (): Promise<void> => {
    await updateSettings(DEFAULT_SETTINGS);
  };

  const value: SettingsContextType = {
    settings,
    updateSettings,
    resetSettings,
    loading,
    error,
    convertCurrency,
    formatCurrency,
    exchangeRates,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};