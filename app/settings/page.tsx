'use client';

import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Bell, Shield, Eye, CreditCard, Globe, Save, X, RotateCcw, Wifi, WifiOff, Cloud } from 'lucide-react';
import Header from '../components/Header/Header';
import CustomSelect from '../components/CustomSelect/CustomSelect';
import Switch from '../components/Switch/Switch';
import { useSettings } from '../contexts/SettingsContext';
import styles from './Settings.module.scss';

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings, loading, error } = useSettings();
  const [user, setUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Sincronizar com as configurações do context
  useEffect(() => {
    if (!loading) {
      setLocalSettings(settings);
    }
  }, [settings, loading]);

  // Detectar mudanças
  useEffect(() => {
    if (!loading) {
      setHasUnsavedChanges(JSON.stringify(localSettings) !== JSON.stringify(settings));
    }
  }, [localSettings, settings, loading]);

  // Detectar status de conexão
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateSettings(localSettings);
      setMessage({ 
        type: 'success', 
        text: user ? 'Configurações salvas na nuvem!' : 'Configurações salvas localmente' 
      });
      
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 5000);
      
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: `Erro ao salvar: ${error.message}` 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleResetSettings = async () => {
    if (confirm('Tem certeza que deseja restaurar as configurações padrão? Todas as suas personalizações serão perdidas.')) {
      try {
        await resetSettings();
        setMessage({ type: 'success', text: 'Configurações restauradas para os padrões!' });
      } catch (error: any) {
        setMessage({ type: 'error', text: `Erro ao restaurar: ${error.message}` });
      }
    }
  };

  const discardChanges = () => {
    setLocalSettings(settings);
    setMessage({ type: 'info', text: 'Alterações descartadas.' });
  };

  // Componente de seção de configuração
  const SettingSection = ({ title, icon: Icon, children }: { 
    title: string; 
    icon: any; 
    children: React.ReactNode;
  }) => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <Icon size={20} />
        {title}
      </h2>
      <div className={styles.sectionContent}>
        {children}
      </div>
    </div>
  );

  // Componente de toggle
  const ToggleSetting = ({ 
    label, 
    description, 
    value, 
    onChange 
  }: { 
    label: string; 
    description?: string; 
    value: boolean; 
    onChange: (value: boolean) => void;
  }) => (
    <div className={styles.toggleGroup}>
      <div className={styles.toggleInfo}>
        <label className={styles.toggleLabel}>{label}</label>
        {description && <p className={styles.toggleDescription}>{description}</p>}
      </div>
      <Switch
        checked={value}
        onChange={onChange}
        size="medium"
      />
    </div>
  );

  // Componente de select
  const SelectSetting = ({ 
    label, 
    value, 
    options, 
    onChange 
  }: { 
    label: string; 
    value: string; 
    options: Array<{ value: string; label: string; icon: string }>;
    onChange: (value: string) => void;
  }) => (
    <div className={styles.selectGroup}>
      <label className={styles.selectLabel}>{label}</label>
      <CustomSelect
        options={options}
        value={value}
        onChange={onChange}
        placeholder={`Selecione ${label.toLowerCase()}`}
      />
    </div>
  );

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner}></div>
            <p>Carregando configurações...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <h1 className={styles.title}>Configurações</h1>
            <div className={styles.connectionStatus}>
              {user ? (
                <div className={`${styles.status} ${isOnline ? styles.online : styles.offline}`}>
                  {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                  {isOnline ? 'Sincronizado' : 'Offline'}
                </div>
              ) : (
                <div className={styles.status}>
                  <Cloud size={16} />
                  Modo Local
                </div>
              )}
            </div>
          </div>
          <p className={styles.subtitle}>
            {user 
              ? 'Suas configurações são sincronizadas na nuvem' 
              : 'Faça login para sincronizar entre dispositivos'
            }
          </p>
        </div>

        {error && (
          <div className={`${styles.message} ${styles.error}`}>
            <div className={styles.messageContent}>
              Erro de sincronização: {error}
            </div>
            <button 
              onClick={() => setMessage({ type: '', text: '' })} 
              className={styles.closeMessage}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {message.text && !error && (
          <div className={`${styles.message} ${styles[message.type]}`}>
            <div className={styles.messageContent}>
              {message.type === 'success' && '✓ '}
              {message.type === 'error' && '✗ '}
              {message.type === 'info' && 'ℹ '}
              {message.text}
            </div>
            <button 
              onClick={() => setMessage({ type: '', text: '' })} 
              className={styles.closeMessage}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className={styles.form}>
          <div className={styles.content}>
            <SettingSection title="Notificações" icon={Bell}>
              <ToggleSetting
                label="Notificações por E-mail"
                description="Receba atualizações importantes por e-mail"
                value={localSettings.emailNotifications}
                onChange={(value) => handleSettingChange('emailNotifications', value)}
              />
              <ToggleSetting
                label="Notificações Push"
                description="Receba notificações no navegador"
                value={localSettings.pushNotifications}
                onChange={(value) => handleSettingChange('pushNotifications', value)}
              />
              <ToggleSetting
                label="Alertas de Transação"
                description="Seja notificado sobre transações importantes"
                value={localSettings.transactionAlerts}
                onChange={(value) => handleSettingChange('transactionAlerts', value)}
              />
              <ToggleSetting
                label="Relatórios Semanais"
                description="Receba um resumo semanal das suas finanças"
                value={localSettings.weeklyReports}
                onChange={(value) => handleSettingChange('weeklyReports', value)}
              />
            </SettingSection>

            <SettingSection title="Privacidade" icon={Eye}>
              <SelectSetting
                label="Visibilidade do Perfil"
                value={localSettings.profileVisibility}
                options={[
                  { value: 'public', label: 'Público', icon: '🌎' },
                  { value: 'friends', label: 'Apenas Amigos', icon: '👥' },
                  { value: 'private', label: 'Privado', icon: '🔒' }
                ]}
                onChange={(value) => handleSettingChange('profileVisibility', value)}
              />
              <ToggleSetting
                label="Compartilhamento de Dados Anônimos"
                description="Ajude a melhorar nossos serviços compartilhando dados anônimos"
                value={localSettings.dataSharing}
                onChange={(value) => handleSettingChange('dataSharing', value)}
              />
            </SettingSection>

            <SettingSection title="Aparência" icon={Globe}>
              <SelectSetting
                label="Tema"
                value={localSettings.theme}
                options={[
                  { value: 'light', label: 'Claro', icon: '🌞' },
                  { value: 'dark', label: 'Escuro', icon: '🌙' },
                  { value: 'auto', label: 'Automático', icon: '⚙️' }
                ]}
                onChange={(value) => handleSettingChange('theme', value)}
              />
              <SelectSetting
                label="Idioma"
                value={localSettings.language}
                options={[
                  { value: 'pt-BR', label: 'Português (Brasil)', icon: '🇧🇷' },
                  { value: 'en-US', label: 'English (US)', icon: '🇺🇸' },
                  { value: 'es-ES', label: 'Español', icon: '🇪🇸' }
                ]}
                onChange={(value) => handleSettingChange('language', value)}
              />
              <SelectSetting
                label="Moeda Padrão"
                value={localSettings.currency}
                options={[
                  { value: 'BRL', label: 'Real Brasileiro (R$)', icon: '💰' },
                  { value: 'USD', label: 'Dólar Americano ($)', icon: '💵' },
                  { value: 'EUR', label: 'Euro (€)', icon: '💶' }
                ]}
                onChange={(value) => handleSettingChange('currency', value)}
              />
            </SettingSection>

            <SettingSection title="Segurança" icon={Shield}>
              <ToggleSetting
                label="Autenticação de Dois Fatores"
                description="Aumente a segurança da sua conta"
                value={localSettings.twoFactorAuth}
                onChange={(value) => handleSettingChange('twoFactorAuth', value)}
              />
              <SelectSetting
                label="Tempo de Sessão"
                value={localSettings.sessionTimeout}
                options={[
                  { value: '15', label: '15 minutos', icon: '⏱️' },
                  { value: '30', label: '30 minutos', icon: '⏱️' },
                  { value: '60', label: '1 hora', icon: '⏱️' },
                  { value: '120', label: '2 horas', icon: '⏱️' }
                ]}
                onChange={(value) => handleSettingChange('sessionTimeout', value)}
              />
              <ToggleSetting
                label="Logout Automático"
                description="Sair automaticamente após o tempo de sessão"
                value={localSettings.autoLogout}
                onChange={(value) => handleSettingChange('autoLogout', value)}
              />
            </SettingSection>

            <SettingSection title="Preferências" icon={CreditCard}>
              <SelectSetting
                label="Visualização Padrão"
                value={localSettings.defaultView}
                options={[
                  { value: 'dashboard', label: 'Dashboard', icon: '📊' },
                  { value: 'transactions', label: 'Transações', icon: '💸' },
                  { value: 'reports', label: 'Relatórios', icon: '📈' }
                ]}
                onChange={(value) => handleSettingChange('defaultView', value)}
              />
            </SettingSection>
          </div>

          <div className={styles.footer}>
            <div className={styles.footerHeader}>
              {hasUnsavedChanges ? (
                <div className={styles.unsavedIndicator}>
                  <div className={styles.unsavedBadge}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="8" cy="8" r="6"/>
                    </svg>
                    {user ? 'Alterações não sincronizadas' : 'Alterações locais'}
                  </div>
                  <p className={styles.unsavedText}>
                    {user 
                      ? 'Suas alterações serão salvas na nuvem e disponíveis em todos os dispositivos.'
                      : 'Faça login para sincronizar suas configurações entre dispositivos.'
                    }
                  </p>
                </div>
              ) : (
                <div className={styles.savedIndicator}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M6.5 10.5L3.5 7.5L2.5 8.5L6.5 12.5L13.5 5.5L12.5 4.5L6.5 10.5Z"/>
                  </svg>
                  {user ? 'Tudo sincronizado' : 'Configurações salvas localmente'}
                </div>
              )}
            </div>

            <div className={styles.footerActions}>
              <div className={styles.leftActions}>
                <button 
                  type="button" 
                  onClick={handleResetSettings}
                  className={styles.resetButton}
                >
                  <RotateCcw size={16} />
                  Restaurar Padrões
                </button>
                
                {hasUnsavedChanges && (
                  <button 
                    type="button" 
                    onClick={discardChanges}
                    className={styles.discardButton}
                  >
                    <X size={16} />
                    Descartar
                  </button>
                )}
              </div>
              
              <button 
                type="submit" 
                disabled={saving || !hasUnsavedChanges}
                className={`${styles.saveButton} ${
                  hasUnsavedChanges ? styles.saveButtonActive : styles.saveButtonInactive
                }`}
              >
                {saving ? (
                  <>
                    <div className={styles.spinner}></div>
                    {user ? 'Sincronizando...' : 'Salvando...'}
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {user ? 'Sincronizar' : 'Salvar Local'}
                    {hasUnsavedChanges && <span className={styles.saveBadge}>•</span>}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}