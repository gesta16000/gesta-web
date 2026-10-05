'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Sidebar from '../../components/Sidebar';
import { Search, Plus, FileText, Calendar, Building2, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ContratsPage() {
  const router = useRouter();
  const [contrats, setContrats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('contrats')
        .select(`
          *,
          prestataires ( societe, ville )
        `)
        .order('date_fin', { ascending: true });

      if (error) {
        console.error('Erreur:', error.message);
      } else {
        setContrats(data || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [router]);

  const filteredContrats = contrats.filter(c => 
    c.nom_marche?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.prestataires?.societe?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getContractStatus = (dateFin: string) => {
    if (!dateFin) return { label: 'Sans échéance', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400', progress: 0, days: 9999 };
    
    const today = new Date();
    const end = new Date(dateFin);
    const diffTime = end.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const totalDuration = 1000;
    const daysElapsed = totalDuration - daysRemaining;
    const progress = Math.min(100, Math.max(0, (daysElapsed / totalDuration) * 100));

    if (daysRemaining < 0) return { label: 'Échu', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400', progress: 100, days: daysRemaining };
    if (daysRemaining <= 60) return { label: 'Urgent', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', progress, days: daysRemaining };
    return { label: 'Actif', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', progress, days: daysRemaining };
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">Chargement des contrats...</div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Contrats & Marchés</h1>
          <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm">A</div>
        </header>

        <div className="p-8">
          {/* Barre d'actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un marché, un prestataire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <button
              onClick={() => router.push('/contrats/ajouter')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              Nouveau contrat
            </button>
          </div>

          {/* BENTO GRID DES CONTRATS */}
          {filteredContrats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
              <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">Aucun contrat trouvé.</p>
            </div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.05 } }
              }}
            >
              {filteredContrats.map((contrat) => {
                const status = getContractStatus(contrat.date_fin);
                
                return (
                  <motion.div
                    key={contrat.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="group bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer"
                    onClick={() => router.push(`/prestataires/${contrat.prestataire_id}`)}
                  >
                    {/* En-tête avec badge statut */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white shadow-md">
                        <FileText className="h-6 w-6" />
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                        {status.label === 'Échu' ? <AlertTriangle className="h-3 w-3" /> : status.label === 'Urgent' ? <Clock className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                        {status.label}
                      </span>
                    </div>

                    {/* Nom du marché */}
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1 line-clamp-1">{contrat.nom_marche}</h3>
                    
                    {/* Prestataire */}
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mb-4">
                      <Building2 className="h-3.5 w-3.5" />
                      {contrat.prestataires?.societe || 'Prestataire inconnu'}
                    </div>

                    {/* Budget et Type */}
                    <div className="space-y-2 mb-5 pb-5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Budget</span>
                        <div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{contrat.budget || '-'}</span>
                        {contrat.montant_marche && (
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(contrat.montant_marche)}
                      </p>
                      )}
                      </div>
                      </div>
                      {contrat.type_contrat && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</span>
                          <span className="text-xs text-slate-600 dark:text-slate-300">{contrat.type_contrat}</span>
                        </div>
                      )}
                    </div>

                    {/* Barre de progression */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {contrat.date_debut ? new Date(contrat.date_debut).toLocaleDateString('fr-FR') : '?'}
                        </span>
                        <span className="flex items-center gap-1">
                          {contrat.date_fin ? new Date(contrat.date_fin).toLocaleDateString('fr-FR') : '?'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${status.progress}%` }}
                          transition={{ duration: 1, delay: 0.2 }}
                          className={`h-2 rounded-full ${status.days < 0 ? 'bg-rose-500' : status.days < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        />
                      </div>
                    </div>

                    {/* Footer avec jours restants */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {status.days > 0 ? `${status.days} jours restants` : `Échu depuis ${Math.abs(status.days)}j`}
                      </div>
                      <span className="flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                        Voir <TrendingUp className="h-4 w-4" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          <div className="mt-6 flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
            <p>{filteredContrats.length} contrat(s) affiché(s)</p>
          </div>
        </div>
      </main>
    </div>
  );
}