'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Sidebar from '../../../components/Sidebar';
import { Mail, CheckCircle2, XCircle, Calendar } from 'lucide-react';

export default function AdminEmailLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') { router.push('/dashboard'); return; }
      
      fetchLogs();
    };
    checkAdmin();
  }, [router]);

  const fetchLogs = async () => {
    const { data } = await supabase.from('email_logs').select('*').order('date_envoi', { ascending: false }).limit(50);
    setLogs(data || []);
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center">Chargement des logs...</div>;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" /> Historique des Envois d'Emails
          </h1>
        </header>

        <div className="p-8 max-w-5xl mx-auto">
          <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date & Heure</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Destinataires</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(log.date_envoi).toLocaleString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                      {log.destinataires?.join(', ')}
                    </td>
                    <td className="px-6 py-4">
                      {log.statut === 'success' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Succès
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                          <XCircle className="w-3 h-3" /> Erreur
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {log.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <div className="p-8 text-center text-slate-500">Aucun envoi enregistré pour le moment.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}