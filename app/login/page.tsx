'use client';

import { motion } from 'framer-motion';
import { LogIn, Github, Mail, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth, loginWithGoogle } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import styles from './login.module.scss';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        router.push('/'); // redireciona para home ou /investments
      }
    });
    return () => unsub();
  }, [router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push('/');
    } catch (err) {
      console.error('Erro no login:', err);
      alert('Erro ao tentar fazer login');
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
        <div className={styles.logo}>
          <Sparkles size={32} />
          <h1>Orion</h1>
        </div>

        <h2>Bem-vindo de volta</h2>
        <p>Entre para acessar seu painel financeiro e acompanhar seus investimentos.</p>

        <div className={styles.buttons}>
          <button
            className={`${styles.googleBtn} ${loading ? styles.loading : ''}`}
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <img src="/google.svg" alt="Google" className={styles.googleIcon} />
            {loading ? 'Entrando...' : 'Entrar com Google'}
          </button>

          <button className={styles.emailBtn} disabled>
            <Mail size={18} />
            Entrar com E-mail (em breve)
          </button>

          <button className={styles.githubBtn} disabled>
            <Github size={18} />
            GitHub (em breve)
          </button>
        </div>

        <footer className={styles.footer}>
          <p>Desenvolvido por <strong>Lucas</strong> © {new Date().getFullYear()}</p>
        </footer>
      </motion.div>
    </div>
  );
}
