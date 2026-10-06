'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Sidebar from '../../../components/Sidebar';
import { Mail, Plus, Trash2, Send, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminEmailConfigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [destinataires, setDestinataires] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [configId, setConfigId] = useState<string | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile && profile.role === 'user') {
          router.push('/dashboard');
          return;
        }
        
        fetchConfig();
      } catch (err) {
        console.error('Erreur inattendue:', err);
        setLoading(false);
      }
    };
    checkAdmin();
  }, [router]);

  const fetchConfig = async () => {
    const { data, error } = await supabase
      .from('email_config')
      .select('id, destinataires')
      .limit(1)
      .single();
    
    if (data && data.id) {
      setConfigId(data.id);
      setDestinataires(data.destinataires || ['gesta16000@gmail.com']);
    } else {
      setDestinataires(['gesta16000@gmail.com']);
    }
    setLoading(false);
  };

  const handleAddEmail = () => {
    if (!newEmail || !newEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Email invalide' });
      return;
    }
    if (destinataires.includes(newEmail)) {
      setMessage({ type: 'error', text: 'Cet email est déjà dans la liste' });
      return;
    }
    setDestinataires([...destinataires, newEmail]);
    setNewEmail('');
    setMessage({ type: 'success', text: 'Email ajouté ! N\'oubliez pas de sauvegarder.' });
  };

  const handleRemoveEmail = (email: string) => {
    setDestinataires(destinataires.filter(e => e !== email));
    setMessage({ type: 'success', text: 'Email retiré. N\'oubliez pas de sauvegarder.' });
  };

  const handleSave = async () => {
    setMessage({ type: 'success', text: 'Sauvegarde en cours...' });

    try {
      if (configId) {
        const { error } = await supabase
          .from('email_config')
          .update({ 
            destinataires: destinataires, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', configId);
        
        if (error) throw error;
      } else {
        const { data: newConfig, error } = await supabase
          .from('email_config')
          .insert({ destinataires: destinataires })
          .select('id')
          .single();
        
        if (error) throw error;
        setConfigId(newConfig.id);
      }

      setMessage({ type: 'success', text: '✅ Configuration sauvegardée avec succès !' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Erreur détaillée:', err);
      setMessage({ type: 'error', text: 'Erreur : ' + (err.message || 'Vérifiez la console') });
    }
  };

  // CORRECTION ICI : On utilise notre API qui fonctionne
  const handleTestEmail = async () => {
    setSending(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/send-alerts', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '✅ ' + (data.message || 'Email de test envoyé avec succès !') });
      } else {
        setMessage({ type: 'error', text: '❌ Erreur : ' + (data.error || 'Erreur inconnue') });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: '❌ Erreur de connexion : ' + err.message });
    }

    setSending(false);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-indigo-600 dark:text-indigo-400 font-medium animate-pulse flex flex-col items-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        Chargement de l'espace admin...
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Configuration des Emails
          </h1>
        </header>

        <div className="p-8 max-w-4xl mx-auto">
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                message.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : null}
              {message.text}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 mb-6"
          >
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Destinataires des rapports automatiques</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Ces personnes recevront le rapport quotidien des contrats à échéance.</p>

            <div className="flex gap-3 mb-6">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                placeholder="nouveau@email.com"
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <button onClick={handleAddEmail} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>

            <div className="space-y-2">
              {destinataires.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Aucun destinataire configuré.</p>
              ) : (
                destinataires.map((email) => (
                  <div key={email} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{email}</span>
                    </div>
                    <button onClick={() => handleRemoveEmail(email)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button onClick={handleSave} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all">
                <Save className="w-4 h-4" /> Sauvegarder la configuration
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white"
          >
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Send className="w-5 h-5" /> Tester l'envoi d'un email
            </h2>
            <p className="text-sm text-indigo-100 mb-6">Envoie un email de test à tous les destinataires configurés pour vérifier que tout fonctionne.</p>
            <button
              onClick={handleTestEmail}
              disabled={sending || destinataires.length === 0}
              className="flex items-center gap-2 bg-white hover:bg-slate-100 disabled:bg-slate-300 text-indigo-700 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours...</>
              ) : (
                <><Send className="w-4 h-4" /> Envoyer un email de test</>
              )}
            </button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}