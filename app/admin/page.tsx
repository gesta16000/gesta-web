'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Sidebar from '../../components/Sidebar';
import { Shield, Users, Mail, CheckCircle2, XCircle, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalEmailsSent: 0,
    successEmails: 0,
    errorEmails: 0
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { 
        router.push('/login'); 
        return; 
      }

      console.log("🔍 ID de l'utilisateur connecté :", user.id);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      console.log("📦 Résultat de la requête profil :", profile);
      console.log("⚠️ Erreur de la requête (si il y en a une) :", error);

      if (profile?.role !== 'admin') {
        console.log("🚫 Accès refusé car le rôle est :", profile?.role);
        router.push('/dashboard');
        return;
      }

      console.log("✅ Accès Admin autorisé !");
      fetchAdminData();
    };
    checkAdmin();
  }, [router]);

  const fetchAdminData = async () => {
    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: totalAdmins } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin');
    
    const { count: totalEmailsSent } = await supabase.from('email_logs').select('*', { count: 'exact', head: true });
    const { count: successEmails } = await supabase.from('email_logs').select('*', { count: 'exact', head: true }).eq('statut', 'success');
    const { count: errorEmails } = await supabase.from('email_logs').select('*', { count: 'exact', head: true }).eq('statut', 'error');

    const { data: logs } = await supabase.from('email_logs').select('*').order('date_envoi', { ascending: false }).limit(5);
    const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5);

    setStats({
      totalUsers: totalUsers || 0,
      totalAdmins: totalAdmins || 0,
      totalEmailsSent: totalEmailsSent || 0,
      successEmails: successEmails || 0,
      errorEmails: errorEmails || 0
    });
    setRecentLogs(logs || []);
    setRecentUsers(users || []);
    setLoading(false);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-indigo-600 dark:text-indigo-400 font-medium animate-pulse flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        Chargement du tableau de bord admin...
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Tableau de Bord Administrateur
          </h1>
          <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold text-sm">
            A
          </div>
        </header>

        <div className="p-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-white dark:bg-slate-950 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20"><Users className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Utilisateurs</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.totalUsers}</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="bg-white dark:bg-slate-950 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20"><Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" /></div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Administrateurs</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.totalAdmins}</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="bg-white dark:bg-slate-950 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20"><CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Emails réussis</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.successEmails}</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className="bg-white dark:bg-slate-950 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20"><XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" /></div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Emails en erreur</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.errorEmails}</p>
              </div>
            </motion.div>
          </div>

          {/* Actions rapides */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Link href="/admin/utilisateurs">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }} whileHover={{ y: -4 }} className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg cursor-pointer">
                <Users className="w-8 h-8 text-white mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">Gérer les utilisateurs</h3>
                <p className="text-sm text-indigo-100">Attribuer les rôles et permissions</p>
              </motion.div>
            </Link>

            <Link href="/admin/config-emails">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }} whileHover={{ y: -4 }} className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl shadow-lg cursor-pointer">
                <Mail className="w-8 h-8 text-white mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">Configurer les emails</h3>
                <p className="text-sm text-emerald-100">Gérer les destinataires et tester</p>
              </motion.div>
            </Link>

            <Link href="/admin/logs-emails">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.6 }} whileHover={{ y: -4 }} className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-2xl shadow-lg cursor-pointer">
                <Calendar className="w-8 h-8 text-white mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">Voir les logs emails</h3>
                <p className="text-sm text-amber-100">Historique des envois et statuts</p>
              </motion.div>
            </Link>
          </div>

          {/* Dernières activités */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.7 }} className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Derniers envois d'emails
              </h2>
              <div className="space-y-3">
                {recentLogs.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Aucun email envoyé pour le moment.</p>
                ) : (
                  recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{log.destinataires?.join(', ')}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {new Date(log.date_envoi).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      {log.statut === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.8 }} className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Derniers utilisateurs inscrits
              </h2>
              <div className="space-y-3">
                {recentUsers.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Aucun utilisateur inscrit.</p>
                ) : (
                  recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user.email}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Inscrit le {new Date(user.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}