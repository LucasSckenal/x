"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import {
  Camera,
  Loader2,
  User,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Eye, 
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import styles from "./register.module.scss";

export default function RegisterPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);

  // Lógica de Força da Senha
  useEffect(() => {
    let strength = 0;
    if (password.length > 5) strength++;
    if (password.length > 8 && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  }, [password]);

  // Conversão de Imagem
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 200 * 1024) {
        toast.error("Por favor, use uma imagem menor que 200KB.");
        return;
      }
      try {
        const base64 = await convertToBase64(file);
        setBase64Image(base64);
        setImagePreview(base64);
      } catch (err) {
        toast.error("Erro ao processar imagem.");
      }
    }
  };

  // Cadastro Email/Senha
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Preencha todos os campos.");
      return;
    }
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      try {
        await updateProfile(user, {
          displayName: name,
          photoURL: base64Image || null,
        });
      } catch (e) {
        /* Ignora se payload grande demais pro Auth */
      }

      // Salva no Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name,
        email: email,
        photoURL: base64Image || null,
        createdAt: Timestamp.now(),
        preferences: { theme: "dark", currency: "BRL" },
      });

      toast.success("Conta criada com sucesso!");
      router.push("/");
    } catch (error: any) {
      console.error(error);
      if (error.code === "auth/email-already-in-use")
        toast.error("E-mail já cadastrado.");
      else if (error.code === "auth/weak-password")
        toast.error("Senha muito fraca.");
      else toast.error("Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  // Cadastro Google
  const handleGoogleRegister = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const user = res.user;

      // Salva/Merge no Firestore
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          createdAt: Timestamp.now(),
        },
        { merge: true },
      );

      toast.success("Sucesso!");
      router.push("/");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao conectar com Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.splitLayout}>
      {/* LADO ESQUERDO */}
      <div className={styles.formSection}>
        {/* LOGO BADGE */}
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
          <h1>Crie sua conta</h1>
          <p>Junte-se à gestão financeira inteligente.</p>
        </div>

        <form onSubmit={handleRegister} className={styles.formGrid}>
          <div className={styles.avatarWrapper}>
            <label className={styles.avatarCircle}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Preview" />
              ) : (
                <Camera size={24} className={styles.uploadIcon} />
              )}
            </label>
            <div className={styles.avatarText}>
              <span>Foto de Perfil</span>
              <span>Personalize sua experiência (máx 200kb)</span>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Nome Completo</label>
            <div className={styles.inputContainer}>
              <User size={18} />
              <input
                type="text"
                placeholder="Ex: Ana Souza"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>E-mail Corporativo</label>
            <div className={styles.inputContainer}>
              <Mail size={18} />
              <input
                type="email"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Senha de Acesso</label>
            <div className={styles.inputContainer}>
              <Lock size={18} />
              <input
                type={showPassword ? "text" : "password"} // Muda o tipo dinamicamente
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {/* --- 4. BOTÃO DE OLHO (Direita) --- */}
              <button
                type="button" // Importante para não submeter o form
                className={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1} // Opcional: para pular no tab se quiser focar direto no botão enviar
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {password.length > 0 && (
              <div className={styles.passwordStrength}>
                {/* Definição da cor atual baseada na força total */}
                {[1, 2, 3].map((level) => {
                  // Qual cor usar?
                  let colorClass = "";
                  if (passwordStrength === 1) colorClass = styles.weak;
                  if (passwordStrength === 2) colorClass = styles.medium;
                  if (passwordStrength >= 3) colorClass = styles.strong;

                  return (
                    <div
                      key={level}
                      className={`
                        ${styles.bar} 
                        ${passwordStrength >= level ? styles.active : ""} 
                        ${passwordStrength >= level ? colorClass : ""}
                      `}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                Criar Conta Gratuita <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        {/* DIVISOR PREMIUM */}
        <div className={styles.divider}>
          <span>ou registre-se com</span>
        </div>

        {/* BOTÃO SOCIAL */}
        <div className={styles.socialGrid}>
          <button
            type="button"
            className={styles.socialBtn}
            onClick={handleGoogleRegister}
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
          Já possui uma conta? <Link href="/login">Fazer Login</Link>
        </div>
      </div>

      {/* LADO DIREITO: HERO */}
      <div className={styles.visualSection}>
        <div className={styles.heroContent}>
          <div
            style={{
              marginBottom: "1.5rem",
              background: "rgba(0, 179, 126, 0.1)",
              width: "fit-content",
              padding: "0.8rem",
              borderRadius: "12px",
            }}
          >
            <ShieldCheck size={32} color="#00B37E" />
          </div>
          <h2>Segurança de nível bancário para seus dados.</h2>
          <p>
            Utilizamos criptografia de ponta e inteligência artificial para
            categorizar suas finanças automaticamente no <strong>Orion</strong>,
            permitindo que você foque no crescimento do seu patrimônio.
          </p>
        </div>
      </div>
    </div>
  );
}
