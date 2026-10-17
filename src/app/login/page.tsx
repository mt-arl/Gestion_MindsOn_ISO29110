'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { loginAction } from '@/actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar correo guardado en localStorage si el usuario seleccionó "Recordarme" anteriormente
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('mindson_saved_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // localStorage no disponible o bloqueado por el navegador
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Por favor, ingresa tu correo electrónico.');
      return;
    }

    if (!password) {
      setError('Por favor, ingresa tu contraseña.');
      return;
    }

    // Gestionar persistencia local del correo según opción "Recordarme"
    try {
      if (rememberMe) {
        localStorage.setItem('mindson_saved_email', trimmedEmail);
      } else {
        localStorage.removeItem('mindson_saved_email');
      }
    } catch {
      // Ignorar excepciones de localStorage
    }

    startTransition(async () => {
      const res = await loginAction({
        email: trimmedEmail,
        password,
        rememberMe,
      });

      if (res.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(res.error || 'Correo o contraseña incorrectos.');
      }
    });
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 overflow-hidden">
      
      {/* Decorative Ambient Background Glows */}
      <div className="absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[32rem] w-[32rem] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none" />

      {/* Main Card Container */}
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-slate-100 p-8 sm:p-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header: Brand Logo & Title */}
        <div className="text-center space-y-3 mb-8">
          <div className="flex justify-center">
            <div className="relative h-12 w-44">
              <Image
                src="/logo.png"
                alt="MindsOn Instituto de Inglés"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center justify-center gap-1.5">
              Portal Administrativo
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                PRO
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Sistema de Gestión Académica y Control Financiero
            </p>
          </div>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-700 border border-rose-200/80 shadow-xs animate-in fade-in duration-150">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <p className="font-bold text-rose-800">Error de autenticación</p>
              <p className="text-rose-700 font-normal mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mindsonec@gmail.com"
                disabled={isPending}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all disabled:opacity-60"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isPending}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-11 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isPending}
                className="h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500/20 transition cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                Recordar mis datos y mantener sesión iniciada
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 text-sm shadow-md shadow-indigo-600/25 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Iniciando Sesión...</span>
              </>
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Security / Confidentiality Notice */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Acceso seguro protegido con cifrado SSL</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
            Uso restringido únicamente para personal administrativo autorizado de MindsOn English Institute.
          </p>
        </div>

      </div>
    </div>
  );
}
