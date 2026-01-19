"use client";

import { useState, useEffect, useRef } from "react";
import { auth, db } from "../lib/firebase";
import {
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  updateEmail,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Sidebar } from "../components/Sidebar/Sidebar";
import Header from "../components/Header/Header";
import styles from "./Profile.module.scss";
import {
  User as UserIcon,
  Lock,
  Shield,
  Camera,
  Save,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  Wifi,
  WifiOff,
  Trash2,
  LogOut,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

const TABS = [
  {
    id: "personal",
    label: "Dados Pessoais",
    icon: UserIcon,
    desc: "Gerencie sua identidade e contato.",
  },
  {
    id: "security",
    label: "Segurança",
    icon: Lock,
    desc: "Senha e proteção da conta.",
  },
  {
    id: "account",
    label: "Zona de Perigo",
    icon: Shield,
    desc: "Exclusão e dados sensíveis.",
  },
];

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    phone: "",
    address: "",
    photoURL: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [originalData, setOriginalData] = useState<any>(null);

  // Inicialização
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      window.addEventListener("online", () => setIsOnline(true));
      window.addEventListener("offline", () => setIsOnline(false));
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadUserData(currentUser);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Carregar dados
  const loadUserData = async (currentUser: User) => {
    try {
      const docRef = doc(db, "users", currentUser.uid);
      const docSnap = await getDoc(docRef);

      let firestoreData = { phone: "", address: "", photoURL: "" };

      if (docSnap.exists()) {
        const data = docSnap.data();
        firestoreData = {
          phone: data.phone || "",
          address: data.address || "",
          photoURL: data.photoURL || currentUser.photoURL || "",
        };
      }

      const initialData = {
        displayName: currentUser.displayName || "",
        email: currentUser.email || "",
        photoURL: firestoreData.photoURL,
        phone: firestoreData.phone,
        address: firestoreData.address,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      };

      setFormData(initialData);
      setOriginalData(initialData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar perfil.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!originalData) return;
    const isDifferent =
      formData.displayName !== originalData.displayName ||
      formData.email !== originalData.email ||
      formData.phone !== originalData.phone ||
      formData.address !== originalData.address ||
      formData.photoURL !== originalData.photoURL ||
      formData.newPassword !== "";
    setHasUnsavedChanges(isDifferent);
  }, [formData, originalData]);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // --- LÓGICA BASE64 (Upload sem Storage) ---
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => resolve(fileReader.result as string);
      fileReader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Limite de 500KB para não pesar no Firestore
    if (file.size > 500 * 1024) {
      return toast.error("A imagem deve ter menos de 500KB.");
    }

    try {
      setImageUploading(true);
      const base64String = await convertToBase64(file);

      // Salva no Firestore
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(
        userDocRef,
        {
          photoURL: base64String,
          updatedAt: new Date(),
        },
        { merge: true },
      );

      // Tenta salvar no Auth (pode falhar se for muito grande, mas o Firestore garante)
      try {
        await updateProfile(user, { photoURL: base64String });
      } catch (err) {
        console.log("Auth update skipped - foto muito grande para Auth");
      }

      const updatedFormData = { ...formData, photoURL: base64String };
      setFormData(updatedFormData);
      setOriginalData(updatedFormData);

      // Dispara evento para atualizar o Header
      window.dispatchEvent(new CustomEvent("userProfileUpdated"));

      toast.success("Foto atualizada!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar imagem.");
    } finally {
      setImageUploading(false);
    }
  };

  // Salvar alterações de texto
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const updates: Promise<any>[] = [];

    try {
      // Atualiza o nome no Auth se mudou
      if (formData.displayName !== user.displayName) {
        updates.push(
          updateProfile(user, { displayName: formData.displayName }),
        );
      }

      // Atualiza o email no Auth se mudou
      if (formData.email !== user.email) {
        updates.push(updateEmail(user, formData.email));
      }

      // Atualiza a senha se foi fornecida
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error("Senhas não conferem.");
        }
        updates.push(updatePassword(user, formData.newPassword));
      }

      // Atualiza todos os dados no Firestore
      const userDocRef = doc(db, "users", user.uid);
      updates.push(
        setDoc(
          userDocRef,
          {
            displayName: formData.displayName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            photoURL: formData.photoURL,
            updatedAt: new Date(),
          },
          { merge: true },
        ),
      );

      // Executa todas as atualizações
      await Promise.all(updates);

      // Atualiza os estados locais
      const newData = {
        ...formData,
        newPassword: "",
        confirmPassword: "",
        currentPassword: "",
      };

      setFormData(newData);
      setOriginalData(newData);
      setHasUnsavedChanges(false);

      // Dispara evento para atualizar o Header
      window.dispatchEvent(new CustomEvent("userProfileUpdated"));

      toast.success("Perfil salvo com sucesso!");
    } catch (error: any) {
      console.error("Erro ao salvar perfil:", error);

      if (error.code === "auth/requires-recent-login") {
        toast.error("Faça login novamente para salvar alterações sensíveis.");
      } else if (error.code === "auth/email-already-in-use") {
        toast.error("Este email já está em uso.");
      } else if (error.code === "auth/weak-password") {
        toast.error("A senha é muito fraca. Use pelo menos 6 caracteres.");
      } else if (error.message === "Senhas não conferem.") {
        toast.error("As senhas não conferem.");
      } else {
        toast.error("Erro ao salvar as alterações. Tente novamente.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (hasUnsavedChanges && confirm("Descartar todas as alterações?")) {
      setFormData(originalData);
      setHasUnsavedChanges(false);
      toast.success("Alterações descartadas.");
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "personal":
        return (
          <div className={styles.formGrid}>
            <div className={styles.profileHeader}>
              <div className={styles.avatarWrapper}>
                {imageUploading ? (
                  <div className={styles.avatarLoading}>
                    <Loader2 className={styles.spinner} size={24} />
                  </div>
                ) : formData.photoURL ? (
                  <img
                    src={formData.photoURL}
                    alt="Avatar"
                    className={styles.avatar}
                    onError={(e) => {
                      // Fallback se a imagem não carregar
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        const placeholder = document.createElement("div");
                        placeholder.className = styles.avatarPlaceholder;
                        placeholder.textContent =
                          formData.displayName?.charAt(0) || "U";
                        parent.appendChild(placeholder);
                      }
                    }}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {formData.displayName?.charAt(0) || <UserIcon size={36} />}
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  hidden
                  accept="image/*"
                />
                <button
                  className={styles.cameraBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                  title="Alterar foto"
                >
                  <Camera size={18} />
                </button>
              </div>
              <div className={styles.profileInfo}>
                <h3>{formData.displayName || "Usuário"}</h3>
                <p>{formData.email || "Sem email"}</p>
                <p className={styles.uploadHint}>
                  {imageUploading
                    ? "Enviando..."
                    : "Clique no ícone da câmera para alterar a foto"}
                </p>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>
                <UserIcon size={16} /> Nome Completo
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => handleChange("displayName", e.target.value)}
                placeholder="Digite seu nome completo"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>
                <Mail size={16} /> E-mail
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="seu@email.com"
              />
            </div>

            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label>
                  <Phone size={16} /> Telefone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className={styles.inputGroup}>
                <label>
                  <MapPin size={16} /> Endereço
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Rua, número, cidade"
                />
              </div>
            </div>
          </div>
        );

      case "security":
        return (
          <div className={styles.formGrid}>
            <div className={styles.sectionHeader}>
              <h4>Alterar Senha</h4>
              <p>Para sua segurança, escolha uma senha forte.</p>
            </div>
            <div className={styles.inputGroup}>
              <label>Nova Senha</label>
              <input
                type="password"
                value={formData.newPassword}
                onChange={(e) => handleChange("newPassword", e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
              <small className={styles.hint}>
                Use letras, números e símbolos para maior segurança.
              </small>
            </div>
            <div className={styles.inputGroup}>
              <label>Confirmar Nova Senha</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  handleChange("confirmPassword", e.target.value)
                }
                placeholder="Digite a senha novamente"
              />
            </div>
            <div className={styles.securityTip}>
              <Shield size={16} />
              <span>Sua senha é criptografada e nunca compartilhada.</span>
            </div>
          </div>
        );

      case "account":
        return (
          <div className={styles.dangerZone}>
            <div className={styles.dangerItem}>
              <div>
                <h4>Sair da Conta</h4>
                <p>Encerrar sessão atual em todos os dispositivos.</p>
              </div>
              <button
                className={styles.outlineBtn}
                onClick={() => {
                  auth.signOut();
                  toast.success("Sessão encerrada.");
                }}
              >
                <LogOut size={16} /> Sair
              </button>
            </div>

            <div className={styles.dangerItem}>
              <div>
                <h4>Excluir Conta</h4>
                <p>
                  Esta ação é irreversível. Todos os seus dados serão apagados
                  permanentemente.
                </p>
              </div>
              <button
                className={styles.outlineBtn}
                onClick={() => {
                  if (
                    confirm(
                      "Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita!",
                    )
                  ) {
                    toast.error(
                      "Funcionalidade de exclusão em desenvolvimento.",
                    );
                  }
                }}
                style={{ borderColor: "#ef4444", color: "#ef4444" }}
              >
                <Trash2 size={16} /> Excluir
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const activeTabInfo = TABS.find((t) => t.id === activeTab);

  return (
    <div className={styles.pageWrapper}>
      <Sidebar />
      <div className={styles.contentColumn}>
        <Header />

        <main className={styles.profileContainer}>
          <div className={styles.pageHeader}>
            <div>
              <h1>Meu Perfil</h1>
              <p>
                Gerencie suas informações pessoais, segurança e preferências da
                conta.
              </p>
            </div>
            <div
              className={`${styles.statusBadge} ${isOnline ? styles.online : styles.offline}`}
            >
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isOnline ? "Online" : "Offline"}
            </div>
          </div>

          <div className={styles.profileLayout}>
            <nav className={styles.sidebarNav}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`${styles.navButton} ${activeTab === tab.id ? styles.active : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon size={18} /> {tab.label}
                </button>
              ))}
            </nav>

            <div className={styles.contentArea}>
              <h2 className={styles.sectionTitle}>{activeTabInfo?.label}</h2>
              <p className={styles.sectionDescription}>{activeTabInfo?.desc}</p>

              <div className={styles.formContent}>
                {loading ? (
                  <div className={styles.loadingState}>
                    <Loader2 className={styles.spinner} size={32} />
                    <p>Carregando perfil...</p>
                  </div>
                ) : (
                  renderContent()
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {hasUnsavedChanges && (
        <div className={styles.actionBar}>
          <div className={styles.unsavedBadge}>
            <AlertTriangle size={16} /> Alterações não salvas
          </div>
          <div className={styles.actionButtons}>
            <button
              className={`${styles.actionBtn} ${styles.discard}`}
              onClick={handleDiscard}
              disabled={saving}
            >
              Descartar
            </button>
            <button
              className={`${styles.actionBtn} ${styles.save}`}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className={styles.spinner} size={18} /> Salvando...
                </>
              ) : (
                <>
                  <Save size={18} /> Salvar Alterações
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
