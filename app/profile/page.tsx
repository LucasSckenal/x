'use client';

import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { User, Mail, Phone, MapPin, Camera, Save, X } from 'lucide-react';
import Header from '../components/Header/Header'; 
import styles from './Profile.module.scss';

export default function ProfilePage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Estados do formulário
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
    address: '',
    photoURL: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Carregar dados do usuário
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setFormData({
          displayName: currentUser.displayName || '',
          email: currentUser.email || '',
          phone: '',
          address: '',
          photoURL: currentUser.photoURL || ''
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      await updateProfile(user, {
        displayName: formData.displayName,
        photoURL: formData.photoURL || null
      });

      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem!' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres!' });
      return;
    }

    setSaving(true);
    try {
      // Reautenticar o usuário
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      
      // Atualizar a senha
      await updatePassword(user, passwordData.newPassword);
      
      setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Aqui você implementaria o upload para o Firebase Storage
      // Por enquanto, vamos apenas criar uma URL local
      const imageUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, photoURL: imageUrl }));
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.loading}>
          <div className={styles.spinner}>Carregando...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Meu Perfil</h1>
          <p className={styles.subtitle}>Gerencie suas informações pessoais</p>
        </div>

        {message.text && (
          <div className={`${styles.message} ${styles[message.type]}`}>
            {message.text}
            <button onClick={() => setMessage({ type: '', text: '' })} className={styles.closeMessage}>
              <X size={16} />
            </button>
          </div>
        )}

        <div className={styles.content}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Informações Pessoais</h2>
            
            <form onSubmit={handleProfileUpdate} className={styles.form}>
              <div className={styles.avatarSection}>
                <div className={styles.avatar}>
                  {formData.photoURL ? (
                    <img src={formData.photoURL} alt="Avatar" className={styles.avatarImage} />
                  ) : (
                    <div className={styles.avatarFallback}>
                      <User size={32} />
                    </div>
                  )}
                  <label htmlFor="avatar-upload" className={styles.avatarUpload}>
                    <Camera size={16} />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className={styles.avatarInput}
                    />
                  </label>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label htmlFor="displayName" className={styles.label}>
                    <User size={16} />
                    Nome Completo
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    className={styles.input}
                    placeholder="Seu nome completo"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="email" className={styles.label}>
                    <Mail size={16} />
                    E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className={`${styles.input} ${styles.disabled}`}
                  />
                  <span className={styles.helpText}>O e-mail não pode ser alterado</span>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="phone" className={styles.label}>
                    <Phone size={16} />
                    Telefone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className={styles.input}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="address" className={styles.label}>
                    <MapPin size={16} />
                    Endereço
                  </label>
                  <input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className={styles.input}
                    placeholder="Seu endereço completo"
                  />
                </div>
              </div>

              <button type="submit" disabled={saving} className={styles.saveButton}>
                <Save size={16} />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Alterar Senha</h2>
            
            <form onSubmit={handlePasswordUpdate} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label htmlFor="currentPassword" className={styles.label}>
                    Senha Atual
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className={styles.input}
                    placeholder="Digite sua senha atual"
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="newPassword" className={styles.label}>
                    Nova Senha
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className={styles.input}
                    placeholder="Digite a nova senha"
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="confirmPassword" className={styles.label}>
                    Confirmar Nova Senha
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className={styles.input}
                    placeholder="Confirme a nova senha"
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={saving} className={styles.saveButton}>
                <Save size={16} />
                {saving ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}