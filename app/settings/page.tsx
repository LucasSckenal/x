'use client';

import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Bell, Shield, Eye, CreditCard, Globe, Database, Save, X } from 'lucide-react';
import Header from '../components/Header/Header';
import CustomSelect from '../components/CustomSelect/CustomSelect';
import Switch from '../components/Switch/Switch';
import styles from './Settings.module.scss';

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Estados das configurações
  const [settings, setSettings] = useState({
    // Notificações
    emailNotifications: true,
    pushNotifications: true,
    transactionAlerts: true,
    weeklyReports: false,
    
    // Privacidade
    profileVisibility: 'private',
    dataSharing: false,
    
    // Aparência
    theme: 'light',
    language: 'pt-BR',
    currency: 'BRL',
    
    // Segurança
    twoFactorAuth: false,
    sessionTimeout: '30',
    
    // Preferências
    defaultView: 'dashboard',
    autoLogout: true
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      // Carregar configurações salvas do localStorage
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prev => ({ 
          ...prev, 
          ...parsedSettings,
          sessionTimeout: parsedSettings.sessionTimeout?.toString() || '30'
        }));
      }

      // Sincronizar com o tema atual
      const currentTheme = document.documentElement.dataset.theme || 'light';
      setSettings(prev => ({ ...prev, theme: currentTheme }));
    });
    return () => unsubscribe();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      localStorage.setItem('userSettings', JSON.stringify(settings));
      document.documentElement.dataset.theme = settings.theme;
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      window.dispatchEvent(new Event('settingsChanged'));
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const SettingSection = ({ title, icon: Icon, children }) => (
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

  const ToggleSetting = ({ label, description, value, onChange }) => (
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

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Configurações</h1>
          <p className={styles.subtitle}>Personalize sua experiência no Next Finance</p>
        </div>

        {message.text && (
          <div className={`${styles.message} ${styles[message.type]}`}>
            {message.text}
            <button onClick={() => setMessage({ type: '', text: '' })} className={styles.closeMessage}>
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
                value={settings.emailNotifications}
                onChange={(value) => handleSettingChange('emailNotifications', value)}
              />
              <ToggleSetting
                label="Notificações Push"
                description="Receba notificações no navegador"
                value={settings.pushNotifications}
                onChange={(value) => handleSettingChange('pushNotifications', value)}
              />
              <ToggleSetting
                label="Alertas de Transação"
                description="Seja notificado sobre transações importantes"
                value={settings.transactionAlerts}
                onChange={(value) => handleSettingChange('transactionAlerts', value)}
              />
              <ToggleSetting
                label="Relatórios Semanais"
                description="Receba um resumo semanal das suas finanças"
                value={settings.weeklyReports}
                onChange={(value) => handleSettingChange('weeklyReports', value)}
              />
            </SettingSection>

            <SettingSection title="Privacidade" icon={Eye}>
              <div className={styles.selectGroup}>
                <label className={styles.selectLabel}>Visibilidade do Perfil</label>
                <CustomSelect
                  options={[
                    { value: 'public', label: 'Público', icon: '🌎' },
                    { value: 'friends', label: 'Apenas Amigos', icon: '👥' },
                    { value: 'private', label: 'Privado', icon: '🔒' }
                  ]}
                  value={settings.profileVisibility}
                  onChange={(value) => handleSettingChange('profileVisibility', value)}
                  placeholder="Selecione a visibilidade"
                />
              </div>
              <ToggleSetting
                label="Compartilhamento de Dados Anônimos"
                description="Ajude a melhorar nossos serviços compartilhando dados anônimos"
                value={settings.dataSharing}
                onChange={(value) => handleSettingChange('dataSharing', value)}
              />
            </SettingSection>

            <SettingSection title="Aparência" icon={Globe}>
              <div className={styles.selectGroup}>
                <label className={styles.selectLabel}>Tema</label>
                <CustomSelect
                  options={[
                    { value: 'light', label: 'Claro', icon: '🌞' },
                    { value: 'dark', label: 'Escuro', icon: '🌙' },
                    { value: 'auto', label: 'Automático', icon: '⚙️' }
                  ]}
                  value={settings.theme}
                  onChange={(value) => handleSettingChange('theme', value)}
                  placeholder="Selecione o tema"
                />
              </div>
              <div className={styles.selectGroup}>
                <label className={styles.selectLabel}>Idioma</label>
                <CustomSelect
                  options={[
                    { value: 'pt-BR', label: 'Português (Brasil)', icon: '🇧🇷' },
                    { value: 'en-US', label: 'English (US)', icon: '🇺🇸' },
                    { value: 'es-ES', label: 'Español', icon: '🇪🇸' }
                  ]}
                  value={settings.language}
                  onChange={(value) => handleSettingChange('language', value)}
                  placeholder="Selecione o idioma"
                />
              </div>
              <div className={styles.selectGroup}>
                <label className={styles.selectLabel}>Moeda Padrão</label>
                <CustomSelect
                  options={[
                    { value: 'BRL', label: 'Real Brasileiro (R$)', icon: '💰' },
                    { value: 'USD', label: 'Dólar Americano ($)', icon: '💵' },
                    { value: 'EUR', label: 'Euro (€)', icon: '💶' }
                  ]}
                  value={settings.currency}
                  onChange={(value) => handleSettingChange('currency', value)}
                  placeholder="Selecione a moeda"
                />
              </div>
            </SettingSection>

            <SettingSection title="Segurança" icon={Shield}>
              <ToggleSetting
                label="Autenticação de Dois Fatores"
                description="Aumente a segurança da sua conta"
                value={settings.twoFactorAuth}
                onChange={(value) => handleSettingChange('twoFactorAuth', value)}
              />
              <div className={styles.selectGroup}>
                <label className={styles.selectLabel}>Tempo de Sessão</label>
                <CustomSelect
                  options={[
                    { value: '15', label: '15 minutos', icon: '⏱️' },
                    { value: '30', label: '30 minutos', icon: '⏱️' },
                    { value: '60', label: '1 hora', icon: '⏱️' },
                    { value: '120', label: '2 horas', icon: '⏱️' }
                  ]}
                  value={settings.sessionTimeout}
                  onChange={(value) => handleSettingChange('sessionTimeout', value)}
                  placeholder="Selecione o tempo de sessão"
                />
              </div>
              <ToggleSetting
                label="Logout Automático"
                description="Sair automaticamente após o tempo de sessão"
                value={settings.autoLogout}
                onChange={(value) => handleSettingChange('autoLogout', value)}
              />
            </SettingSection>

            <SettingSection title="Preferências" icon={CreditCard}>
              <div className={styles.selectGroup}>
                <label className={styles.selectLabel}>Visualização Padrão</label>
                <CustomSelect
                  options={[
                    { value: 'dashboard', label: 'Dashboard', icon: '📊' },
                    { value: 'transactions', label: 'Transações', icon: '💸' },
                    { value: 'reports', label: 'Relatórios', icon: '📈' }
                  ]}
                  value={settings.defaultView}
                  onChange={(value) => handleSettingChange('defaultView', value)}
                  placeholder="Selecione a visualização padrão"
                />
              </div>
            </SettingSection>
          </div>

          <div className={styles.footer}>
            <button type="submit" disabled={saving} className={styles.saveButton}>
              <Save size={16} />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}