// app/register/page.tsx
'use client';

import { motion } from 'framer-motion';
import { Sparkles, UserPlus, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { auth, registerWithEmail, loginWithGoogle } from '../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import Link from 'next/link';
import styles from './register.module.scss';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password) {
      setError('Todos os campos são obrigatórios');
      return false;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return false;
    }

    if (!formData.email.includes('@')) {
      setError('Email inválido');
      return false;
    }

    return true;
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      await registerWithEmail(formData.email, formData.password);
      router.push('/');
    } catch (err: any) {
      console.error('Erro no registro:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este email já está em uso');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email inválido');
      } else if (err.code === 'auth/weak-password') {
        setError('Senha muito fraca');
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push('/');
    } catch (err) {
      console.error('Erro no registro com Google:', err);
      setError('Erro ao registrar com Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={styles.card}
      >
        <Link href="/login" className={styles.backButton}>
          <ArrowLeft size={20} />
        </Link>

        <div className={styles.logo}>
          <Sparkles size={32} />
          <h1>Orion</h1>
        </div>

        <h2>Criar Nova Conta</h2>
        <p>Preencha seus dados para começar a gerenciar seus investimentos</p>

        <form onSubmit={handleEmailRegister} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="name">Nome completo</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Seu nome completo"
              disabled={loading}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="seu@email.com"
              disabled={loading}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Senha</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              disabled={loading}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword">Confirmar senha</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Digite novamente sua senha"
              disabled={loading}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="submit"
            className={`${styles.submitBtn} ${loading ? styles.loading : ''}`}
            disabled={loading}
          >
            <UserPlus size={18} />
            {loading ? 'Criando conta...' : 'Criar Conta'}
          </button>
        </form>

        <div className={styles.divider}>
          <span>ou</span>
        </div>

        <div className={styles.buttons}>
          <button
            className={`${styles.googleBtn} ${loading ? styles.loading : ''}`}
            onClick={handleGoogleRegister}
            disabled={loading}
          >
            <img src="/google.svg" alt="Google" className={styles.googleIcon} />
            Registrar com Google
          </button>
        </div>

        <footer className={styles.footer}>
          <p>
            Já tem uma conta? <Link href="/login">Faça login</Link>
          </p>
          <p>Desenvolvido por <strong>Lucas</strong> © {new Date().getFullYear()}</p>
        </footer>
      </motion.div>
    </div>
  );
}