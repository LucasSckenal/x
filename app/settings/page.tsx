'use client';

import { useState, useEffect } from 'react';
import { useSettings, Settings } from '../contexts/SettingsContext'; // Importando do Contexto
import { Sidebar } from '../components/Sidebar/Sidebar';
import Header from '../components/Header/Header';
import CustomSelect from '../components/CustomSelect/CustomSelect';
import Switch from '../components/Switch/Switch';
import styles from './Settings.module.scss';
import { 
  Bell, Shield, Eye, CreditCard, Globe, 
  Save, AlertTriangle, RotateCcw, Wifi, WifiOff, Download 
} from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'general', label: 'Geral', icon: Globe, desc: 'Idioma, moeda e preferências regionais.' },
  { id: 'appearance', label: 'Aparência', icon: Eye, desc: 'Temas, modo escuro e privacidade visual.' },
  { id: 'notifications', label: 'Notificações', icon: Bell, desc: 'Alertas de segurança e e-mails.' },
  { id: 'privacy', label: 'Privacidade', icon: Shield, desc: 'Segurança da conta e compartilhamento.' },
  { id: 'payments', label: 'Financeiro', icon: CreditCard, desc: 'Padrões de transação e limites.' },
];

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings, loading } = useSettings();
  
  const [activeTab, setActiveTab] = useState('general');
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Sincroniza localSettings quando as configurações globais carregam (ex: ao abrir a página)
  useEffect(() => {
    if (!loading) setLocalSettings(settings);
  }, [settings, loading]);

  // Monitor de Conexão
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', () => setIsOnline(true));
      window.addEventListener('offline', () => setIsOnline(false));
    }
  }, []);

  // Verifica alterações não salvas
  useEffect(() => {
    if (loading) return;
    // Compara removendo lastUpdated para não dar falso positivo
    const cleanLocal = { ...localSettings, lastUpdated: null };
    const cleanGlobal = { ...settings, lastUpdated: null };
    const isDifferent = JSON.stringify(cleanLocal) !== JSON.stringify(cleanGlobal);
    setHasUnsavedChanges(isDifferent);
  }, [localSettings, settings, loading]);

  // Handler Genérico
  const handleChange = (key: keyof Settings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(localSettings); // Chama a função do seu Contexto
      toast.success("Configurações salvas!");
      setHasUnsavedChanges(false);
    } catch (error) {
      toast.error("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if(confirm("Descartar alterações não salvas?")) {
       setLocalSettings(settings);
       toast("Alterações descartadas", { icon: '↩️' });
    }
  };

  // Renderização do Conteúdo
  const renderContent = () => {
    const bindSelect = (key: keyof Settings) => ({
      value: localSettings[key],
      onChange: (val: any) => handleChange(key, val)
    });
    
    const bindSwitch = (key: keyof Settings) => ({
      checked: localSettings[key] as boolean,
      onChange: (checked: boolean) => handleChange(key, checked)
    });

    const bindInput = (key: keyof Settings, type = "text") => ({
      value: localSettings[key] as string | number,
      type,
      onChange: (e: any) => handleChange(key, type === 'number' ? Number(e.target.value) : e.target.value)
    });

    switch (activeTab) {
      case "general":
        return (
          <>
            <div className={styles.settingGroup}>
              <label>Idioma</label>
              <CustomSelect
                options={[
                  { value: "pt-BR", label: "Português (Brasil)" },
                  { value: "en-US", label: "English (US)" },
                ]}
                {...bindSelect("language")}
              />
            </div>
            <div className={styles.settingGroup}>
              <label>Moeda Principal</label>
              <CustomSelect
                options={[
                  { value: "BRL", label: "Real (R$)" },
                  { value: "USD", label: "Dólar ($)" },
                  { value: "EUR", label: "Euro (€)" },
                ]}
                {...bindSelect("currency")}
              />
            </div>
            <div className={styles.settingGroup}>
              <label>Início da Semana</label>
              <CustomSelect
                options={[
                  { value: "sunday", label: "Domingo" },
                  { value: "monday", label: "Segunda-feira" },
                ]}
                {...bindSelect("startOfWeek")}
              />
            </div>
          </>
        );

      case "appearance":
        return (
          <>
            <div className={styles.settingGroup}>
              <label>Tema</label>
              {/* CORREÇÃO: Adicionada a opção 'system' de volta */}
              <CustomSelect
                options={[
                  { value: "system", label: "Seguir o Sistema (Auto)" },
                  { value: "dark", label: "Escuro" },
                  { value: "light", label: "Claro" },
                ]}
                {...bindSelect("theme")}
              />
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <h4>Ocultar Valores (Blur)</h4>
                <p>Inicia com valores borrados.</p>
              </div>
              <Switch {...bindSwitch("blurValues")} />
            </div>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <h4>Modo Compacto</h4>
                <p>Reduz espaçamentos.</p>
              </div>
              <Switch {...bindSwitch("compactMode")} />
            </div>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <h4>Reduzir Movimento</h4>
                <p>Remove animações pesadas.</p>
              </div>
              <Switch {...bindSwitch("reducedMotion")} />
            </div>
          </>
        );
        
      case "notifications":
        return (
          <>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <h4>Notificações por E-mail</h4>
                <p>Resumos e alertas.</p>
              </div>
              <Switch {...bindSwitch("emailNotifications")} />
            </div>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <h4>Alertas de Gastos</h4>
                <p>Avisar ao exceder orçamento.</p>
              </div>
              <Switch {...bindSwitch("spendingAlerts")} />
            </div>
            <div className={styles.settingGroup} style={{ marginTop: 20 }}>
              <label>Lembrete de Contas (Dias antes)</label>
              <input
                className={styles.inputField}
                {...bindInput("billReminderDays", "number")}
                min="1"
                max="30"
                style={{
                  background: "#0d0e10",
                  border: "1px solid #333",
                  color: "white",
                  padding: 10,
                  borderRadius: 8,
                  width: "100%",
                }}
              />
            </div>
          </>
        );

      case "privacy":
        return (
          <>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <h4>Compartilhar Dados</h4>
                <p>Ajuda a melhorar o app.</p>
              </div>
              <Switch {...bindSwitch("dataSharing")} />
            </div>
            <div className={styles.settingGroup} style={{ marginTop: 20 }}>
              <label>Tempo de Sessão (Auto-lock)</label>
              <CustomSelect
                options={[
                  { value: "15", label: "15 Minutos" },
                  { value: "30", label: "30 Minutos" },
                  { value: "60", label: "1 Hora" },
                ]}
                {...bindSelect("sessionTimeout")}
              />
            </div>
            <div className={styles.settingGroup} style={{ marginTop: 30 }}>
              <button
                className={styles.navButton}
                style={{
                  border: "1px solid rgba(255,255,255,0.1)",
                  width: "100%",
                }}
              >
                <Download size={16} /> Baixar Meus Dados (CSV)
              </button>
            </div>
          </>
        );

      case "payments":
        return (
          <>
            <div className={styles.settingGroup}>
              <label>Método Padrão</label>
              <CustomSelect
                options={[
                  { value: "credit", label: "Cartão de Crédito" },
                  { value: "debit", label: "Débito / PIX" },
                  { value: "cash", label: "Dinheiro" },
                ]}
                {...bindSelect("defaultMethod")}
              />
            </div>
            <div className={styles.settingGroup}>
              <label>Limite Diário de Alerta (R$)</label>
              <input
                {...bindInput("dailyLimit", "number")}
                style={{
                  background: "#0d0e10",
                  border: "1px solid #333",
                  color: "white",
                  padding: 10,
                  borderRadius: 8,
                  width: "100%",
                }}
              />
            </div>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <h4>Arredondar Valores</h4>
                <p>Ocultar centavos no dashboard.</p>
              </div>
              <Switch {...bindSwitch("roundAmounts")} />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const activeTabInfo = TABS.find(t => t.id === activeTab);

  return (
    <div className={styles.pageWrapper}>
      <Sidebar />
      <div className={styles.contentColumn}>
        <Header />
        
        <main className={styles.settingsContainer}>
          <div className={styles.pageHeader}>
            <div>
              <h1>Configurações</h1>
              <p>Gerencie suas preferências.</p>
            </div>
            <div className={`${styles.statusBadge} ${isOnline ? styles.online : styles.offline}`}>
              {isOnline ? <Wifi size={14}/> : <WifiOff size={14}/>}
              {isOnline ? 'Conectado' : 'Offline'}
            </div>
          </div>

          <div className={styles.settingsLayout}>
            <nav className={styles.sidebarNav}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  className={`${styles.navButton} ${activeTab === tab.id ? styles.active : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon size={18} className={styles.navIcon} />
                  {tab.label}
                </button>
              ))}
              <div style={{height: 20}} />
              <button className={styles.navButton} onClick={() => { if(confirm("Restaurar?")) resetSettings(); }}>
                 <RotateCcw size={18} /> Restaurar Padrões
              </button>
            </nav>

            <div className={styles.contentArea}>
              <h2 className={styles.sectionTitle}>{activeTabInfo?.label}</h2>
              <p className={styles.sectionDesc}>{activeTabInfo?.desc}</p>
              
              <div className={styles.formContent}>
                {loading ? (
                  <div style={{padding: 40, textAlign: 'center', color: '#666'}}>Carregando...</div>
                ) : renderContent()}
              </div>
            </div>
          </div>
        </main>
      </div>

      {hasUnsavedChanges && (
        <div className={styles.actionBar}>
           <div className={styles.unsavedBadge}><AlertTriangle size={16} /> Não salvo</div>
           <button className={`${styles.actionBtn} ${styles.discard}`} onClick={handleDiscard}>Descartar</button>
           <button className={`${styles.actionBtn} ${styles.save}`} onClick={handleSave} disabled={saving}>
             {saving ? 'Salvando...' : <><Save size={18}/> Salvar Alterações</>}
           </button>
        </div>
      )}
    </div>
  );
}