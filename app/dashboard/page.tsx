'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Sidebar from '../../components/Sidebar';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Building2, FileText, AlertTriangle, TrendingUp, Bell, Euro, TrendingDown, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const formatEuro = (montant: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(montant);
};

const PIE_COLORS = ['#4f46e5', '#d97706', '#db2777', '#059669'];

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ prestataires: 0, contrats: 0, urgents: 0, echus: 0 });
  const [budgetPieData, setBudgetPieData] = useState<any[]>([]);
  const [financialStats, setFinancialStats] = useState({ total: 0, totaleMontant: 0, principale: 0, annexe: 0, regie: 0 });
  const [urgentContrats, setUrgentContrats] = useState<any[]>([]);
  
  // NOUVEAU : Données comparatives
  const [anneeCourante] = useState(new Date().getFullYear());
  const [budgetsVotes, setBudgetsVotes] = useState<any[]>([]);
  const [depensesParLigne, setDepensesParLigne] = useState<Record<string, number>>({});
  const [remboursementsRegie, setRemboursementsRegie] = useState<number>(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      fetchData();
    };
    checkAuth();
  }, [router]);

  const fetchData = async () => {
    const { count: countPrest } = await supabase.from('prestataires').select('*', { count: 'exact', head: true });
    const { data: contrats } = await supabase.from('contrats').select('*');
    
    if (contrats) {
      let urgents = 0, echus = 0;
      const today = new Date();
      let totaleMontant = 0, principale = 0, annexe = 0, regie = 0, countWithBudget = 0;

      contrats.forEach(c => {
        if (c.date_fin) {
          const diffDays = Math.ceil((new Date(c.date_fin).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) echus++;
          else if (diffDays <= 60) urgents++;
        }
        if (c.montant_marche) {
          countWithBudget++;
          totaleMontant += Number(c.montant_marche);
          if (c.budget === 'Principale') principale += Number(c.montant_marche);
          else if (c.budget === 'Annexe') annexe += Number(c.montant_marche);
          else if (c.budget === 'Régie d\'avance') regie += Number(c.montant_marche);
        }
      });

      setStats({ prestataires: countPrest || 0, contrats: contrats.length, urgents, echus });
      setBudgetPieData([
        { name: 'Principale', value: principale, color: PIE_COLORS[0] },
        { name: 'Annexe', value: annexe, color: PIE_COLORS[1] },
        { name: 'Régie d\'avance', value: regie, color: PIE_COLORS[2] },
      ].filter(item => item.value > 0));
      setFinancialStats({ total: countWithBudget, totaleMontant, principale, annexe, regie });
      setUrgentContrats(contrats.filter(c => {
        if (!c.date_fin) return false;
        return Math.ceil((new Date(c.date_fin).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) <= 60;
      }).slice(0, 5));
    }

    // NOUVEAU : Récupérer budgets votés et dépenses de l'année
    const { data: bvData } = await supabase.from('budgets_votes').select('*').eq('annee', anneeCourante);
    setBudgetsVotes(bvData || []);

    const { data: depData } = await supabase.from('depenses').select('*').eq('annee_imputation', anneeCourante);
    if (depData) {
      const depByLigne: Record<string, number> = {};
      depData.forEach((d: any) => {
        // On regroupe par type_budget du contrat (il faudrait un join, mais pour simplifier on utilise le champ budget du contrat)
        const key = `dep_${d.contrat_id}`;
        depByLigne[key] = (depByLigne[key] || 0) + Number(d.montant_ttc);
      });
      setDepensesParLigne(depByLigne);
    }

    // Récupérer les remboursements régie de l'année
    const { data: regieData } = await supabase.from('remboursements_regie').select('montant').eq('annee', anneeCourante);
    const totalRegie = regieData?.reduce((sum: number, r: any) => sum + Number(r.montant), 0) || 0;
    setRemboursementsRegie(totalRegie);

    setLoading(false);
  };

  // Calculer les totaux dépensés par type de budget
  const getDepensesByBudget = async () => {
    // On récupère les contrats avec leurs dépenses
    const result: Record<string, number> = { Principale: 0, Annexe: 0 };
    
    const { data: contrats } = await supabase.from('contrats').select('id, budget');
    const { data: deps } = await supabase.from('depenses').select('*').eq('annee_imputation', anneeCourante);
    
    if (contrats && deps) {
      deps.forEach((d: any) => {
        const contrat = contrats.find(c => c.id === d.contrat_id);
        if (contrat?.budget && result[contrat.budget] !== undefined) {
          result[contrat.budget] += Number(d.montant_ttc);
        }
      });
    }
    return result;
  };

  const [depensesBudget, setDepensesBudget] = useState<Record<string, number>>({ Principale: 0, Annexe: 0 });

  useEffect(() => {
    getDepensesByBudget().then(setDepensesBudget);
  }, [anneeCourante]);

  // Construire les lignes comparatives
  const compareLines = [
    { label: 'Principale - Fonctionnement', type: 'Principale', cat: 'Fonctionnement', color: 'indigo' },
    { label: 'Principale - Investissement', type: 'Principale', cat: 'Investissement', color: 'purple' },
    { label: 'Annexe - Fonctionnement', type: 'Annexe', cat: 'Fonctionnement', color: 'emerald' },
    { label: 'Annexe - Investissement', type: 'Annexe', cat: 'Investissement', color: 'amber' },
  ].map(line => {
    const bv = budgetsVotes.find(b => b.type_budget === line.type && b.categorie === line.cat);
    const vote = bv ? Number(bv.montant_ttc) : 0;
    // Pour simplifier, on répartit les dépenses proportionnellement (en attendant mieux)
    const totalDepType = depensesBudget[line.type] || 0;
    const totalVoteType = budgetsVotes.filter(b => b.type_budget === line.type).reduce((s, b) => s + Number(b.montant_ttc), 0);
    const depense = totalVoteType > 0 ? (totalDepType * vote / totalVoteType) : 0;
    const pct = vote > 0 ? Math.round(depense / vote * 100) : 0;
    return { ...line, vote, depense, pct };
  });

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">Chargement du tableau de bord...</div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Vue d'ensemble</h1>
          <div className="flex items-center gap-4">
            <button className="relative rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500"></span>
            </button>
            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm">A</div>
          </div>
        </header>

        <div className="p-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard title="Prestataires" value={stats.prestataires.toString()} icon={<Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />} color="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500" delay={0} />
            <KPICard title="Contrats actifs" value={stats.contrats.toString()} icon={<FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />} color="bg-emerald-50 dark:bg-emerald-900/30 border-l-4 border-l-emerald-500" delay={0.1} />
            <KPICard title="Échéances < 60j" value={stats.urgents.toString()} icon={<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />} color="bg-amber-50 dark:bg-amber-900/30 border-l-4 border-l-amber-500" delay={0.2} />
            <KPICard title="Contrats Échus" value={stats.echus.toString()} icon={<TrendingUp className="w-5 h-5 text-rose-600 dark:text-rose-400" />} color="bg-rose-50 dark:bg-rose-900/30 border-l-4 border-l-rose-500" delay={0.3} />
          </div>

          {/* ANALYSE FINANCIÈRE */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Euro className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Analyse Financière</h2>
              </div>
              <div className="text-right bg-slate-900 dark:bg-black rounded-xl p-4 border border-green-500/30 shadow-lg shadow-green-500/10">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Volume total des marchés</p>
                <p className="text-3xl font-black text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]">
                  {financialStats.totaleMontant > 0 ? formatEuro(financialStats.totaleMontant) : '—'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4 uppercase tracking-wider">Répartition par type de budget</h3>
                {budgetPieData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-500 italic">Aucun montant renseigné</div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={budgetPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" stroke="none">
                          {budgetPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                           // CODE CORRIGÉ :
                        <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString('fr-FR')} €`, '']} />
                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ color: '#cbd5e1', fontWeight: '600' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4 uppercase tracking-wider">Détails</h3>
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 border-l-4 border-l-slate-500">
                  <p className="text-xs text-slate-500 dark:text-slate-300 mb-1 font-medium">Contrats avec montant</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{financialStats.total}</p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl border border-indigo-200 dark:border-indigo-500 border-l-4 border-l-indigo-500">
                  <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-1 font-bold uppercase tracking-wider">Principale</p>
                  <p className="text-xl font-black text-indigo-900 dark:text-indigo-200">{financialStats.principale > 0 ? formatEuro(financialStats.principale) : '—'}</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-xl border border-yellow-200 dark:border-yellow-500 border-l-4 border-l-yellow-500">
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-1 font-bold uppercase tracking-wider">Annexe</p>
                  <p className="text-xl font-black text-yellow-900 dark:text-yellow-200">{financialStats.annexe > 0 ? formatEuro(financialStats.annexe) : '—'}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-xl border border-orange-200 dark:border-orange-500 border-l-4 border-l-orange-500">
                  <p className="text-xs text-orange-700 dark:text-orange-300 mb-1 font-bold uppercase tracking-wider">Régie d'avance</p>
                  <p className="text-xl font-black text-orange-900 dark:text-orange-200">{financialStats.regie > 0 ? formatEuro(financialStats.regie) : '—'}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* NOUVEAU : COMPARATIF VOTÉ vs RÉEL */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Exécution Budgétaire {anneeCourante}</h2>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">Voté vs Réel (TTC)</span>
            </div>

            <div className="space-y-4">
              {compareLines.map((line, i) => {
                const barColor = line.pct >= 90 ? 'bg-rose-500' : line.pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
                const alertColor = line.pct >= 90 ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20' : line.pct >= 70 ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20';
                
                return (
                  <div key={i} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{line.label}</span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Voté: <strong className="text-slate-800 dark:text-slate-200">{line.vote > 0 ? formatEuro(line.vote) : '—'}</strong></span>
                        <span className="text-slate-500 dark:text-slate-400">Réel: <strong className="text-slate-800 dark:text-slate-200">{formatEuro(line.depense)}</strong></span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${alertColor}`}>
                          {line.vote > 0 ? `${line.pct}%` : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(line.pct, 100)}%` }}
                        transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                        className={`h-3 rounded-full ${barColor}`}
                      />
                    </div>
                    {line.vote > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                        Reste: <strong className="text-slate-700 dark:text-slate-300">{formatEuro(line.vote - line.depense)}</strong>
                        {line.pct >= 90 && <span className="ml-2 text-rose-500 font-bold">⚠️ Attention, budget presque épuisé !</span>}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Ligne spéciale Régie d'Avance */}
              <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-orange-800 dark:text-orange-300 text-sm flex items-center gap-2">
                    🅿️ Régie d'Avance - Remboursements {anneeCourante}
                  </span>
                  <span className="text-lg font-black text-orange-600 dark:text-orange-400">
                    {remboursementsRegie > 0 ? formatEuro(remboursementsRegie) : '0 €'}
                  </span>
                </div>
                <p className="text-xs text-orange-600 dark:text-orange-400">Pas de budget voté • Suivi des remboursements aux usagers uniquement</p>
              </div>
            </div>
          </motion.div>

          {/* Actions requises */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800"
          >
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Actions requises
            </h2>
            <div className="space-y-3">
              {urgentContrats.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Aucune urgence. Bravo ! 🎉</p>
              ) : (
                urgentContrats.map(c => {
                  const days = Math.ceil((new Date(c.date_fin).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-700 transition-colors">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{c.nom_marche}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Fin: {new Date(c.date_fin).toLocaleDateString('fr-FR')}
                          {c.montant_marche && <span className="ml-2 font-bold text-green-500 dark:text-green-400">{formatEuro(c.montant_marche)}</span>}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${days < 0 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                        {days < 0 ? `Échu` : `${days}j`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function KPICard({ title, value, icon, color, delay }: { title: string, value: string, icon: any, color: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`bg-white dark:bg-slate-950 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 ${color} flex items-center gap-4 hover:shadow-md transition-shadow`}
    >
      <div className="p-3 rounded-xl bg-white dark:bg-slate-900">{icon}</div>
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{value}</p>
      </div>
    </motion.div>
  );
}