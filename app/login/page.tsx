"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import {
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  LayoutDashboard,
  Eye, // Novo
  EyeOff, // Novo
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import styles from "./login.module.scss";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Estado para visibilidade da senha
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos.");
      return;
    }
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Bem-vindo de volta!");
      router.push("/");
    } catch (error: any) {
      console.error(error);
      if (error.code === "auth/invalid-credential")
        toast.error("E-mail ou senha incorretos.");
      else toast.error("Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const user = res.user;

      // Garante que o usuário exista no Firestore
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          lastLogin: Timestamp.now(),
        },
        { merge: true },
      );

      toast.success("Sucesso!");
      router.push("/dashboard");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao entrar com Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.splitLayout}>
      {/* LADO ESQUERDO: FORMULÁRIO */}
      <div className={styles.formSection}>
        {/* LOGO */}
        <div className={styles.logoArea}>
          <div className={styles.logoBadge}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Orion" />
          </div>
          <div className={styles.appName}>
            Orion
            <span>Finance</span>
          </div>
        </div>

        <div className={styles.header}>
          <h1>Acesse sua conta</h1>
          <p>Gerencie suas finanças com inteligência.</p>
        </div>

        <form onSubmit={handleLogin} className={styles.formGrid}>
          <div className={styles.inputGroup}>
            <label>E-mail</label>
            <div className={styles.inputContainer}>
              <Mail size={18} />
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <label>Senha</label>
              <a href="#" className={styles.forgotPass}>
                Esqueceu a senha?
              </a>
            </div>

            <div className={styles.inputContainer}>
              <Lock size={18} />
              <input
                type={showPassword ? "text" : "password"} // Tipo dinâmico
                placeholder="Sua senha secreta"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                Entrar na Plataforma <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className={styles.divider}>
          <span>ou entre com</span>
        </div>

        <div className={styles.socialGrid}>
          <button
            type="button"
            className={styles.socialBtn}
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path
                  fill="#4285F4"
                  d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
                />
                <path
                  fill="#34A853"
                  d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.274 53.529 L -25.274 56.479 C -23.384 60.229 -19.414 63.239 -14.754 63.239 Z"
                />
                <path
                  fill="#FBBC05"
                  d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.999 L -25.274 45.999 C -26.064 47.589 -26.514 49.369 -26.514 51.239 C -26.514 53.109 -26.064 54.889 -25.274 56.479 L -21.484 53.529 Z"
                />
                <path
                  fill="#EA4335"
                  d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.414 39.239 -23.384 42.249 -25.274 45.999 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
                />
              </g>
            </svg>
            Google
          </button>
        </div>

        <div className={styles.footerLink}>
          Não tem uma conta? <Link href="/register">Criar agora</Link>
        </div>
      </div>

      {/* LADO DIREITO: HERO IMAGE */}
      <div className={styles.visualSection}>
        <div className={styles.heroContent}>
          <div
            style={{
              marginBottom: "1.5rem",
              background: "rgba(130, 87, 229, 0.1)",
              width: "fit-content",
              padding: "0.8rem",
              borderRadius: "12px",
            }}
          >
            <LayoutDashboard size={32} color="#8257e5" />
          </div>
          <h2>Domine suas finanças em um único lugar.</h2>
          <p>
            O <strong>Orion</strong> transforma dados complexos em insights
            claros, ajudando você a tomar as melhores decisões para o seu
            futuro.
          </p>
        </div>
      </div>
    </div>
  );
}
