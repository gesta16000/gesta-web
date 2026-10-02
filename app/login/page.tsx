'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      if (profile?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } else {
      setError('Erreur de connexion. Veuillez réessayer.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* LOGO ROND - Remplace 'logo-p.png' par ton fichier */}
          <img 
            src="/logo-p.png" 
            alt="Logo GESTA" 
            className="h-24 w-24 rounded-full mx-auto mb-4 drop-shadow-xl object-cover border-4 border-white dark:border-slate-800" 
          />
          <h1 className="text-4xl font-black text-slate-900 dark:text-white">GESTA</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-2 font-medium">Gestion des Contrats & Marchés</p>
        </div>

        <div className="bg-white dark:bg-slate-950 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold mb-6 text-center text-slate-800 dark:text-slate-100">Connexion</h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                  className="w-full pl-12 pr-4 py-3.5 text-base border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 text-base border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-rose-700 dark:text-rose-400 text-sm bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3.5 px-4 rounded-xl transition-all font-bold text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Connexion en cours...</>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          © {new Date().getFullYear()} GESTA • Tous droits réservés
        </p>
      </div>
    </div>
  );
}