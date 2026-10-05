'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Sidebar from '../../components/Sidebar';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Building2, FileText, AlertTriangle, TrendingUp, Bell, Euro, TrendingDown, CheckCircle2, Wallet, PiggyBank, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

const formatEuro = (montant: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(montant);
};

const PIE_COLORS = ['#4f46e5', '#d97706', '#db2777'];

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // NOUVEAU : Sélecteur d'année
  const currentYear = new Date().getFullYear();
  const [anneeSelectionnee, setAnneeSelectionnee] = useState(currentYear);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const [stats, setStats] = useState({ prestataires: 0, contrats: 0, urgents: 0, echus: 0 });
  const [urgentContrats, setUrgentContrats] = useState<any[]>([]);
  
  const [budgetsVotes, setBudgetsVotes] = useState<any[]>([]);
  const [depensesReelles, setDepensesReelles] = useState({
    principaleFonc: 0, principaleInvest: 0,
    annexeFonc: 0, annexeInvest: 0,
    regie: 0, total: 0
  });

  const [enveloppesMarches, setEnveloppesMarches] = useState({ totale: 0, principale: 0, annexe: 0 });
  const [pieData, setPieData] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      fetchData();
    };
    checkAuth();
  }, [router, anneeSelectionnee]); // Se relance quand l'année change

  const fetchData = async () => {
    setLoading(true);

    // 1. Stats de base (indépendantes de l'année)
    const { count: countPrest } = await supabase.from('prestataires').select('*', { count: 'exact', head: true });
    const { data: contrats } = await supabase.from('contrats').select('*');
    
    if (contrats) {
      let urgents = 0, echus = 0;
      const today = new Date();
      let totaleMarches = 0, principale = 0, annexe = 0;

      contrats.forEach(c => {
        if (c.date_fin) {
          const diffDays = Math.ceil((new Date(c.date_fin).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) echus++;
          else if (diffDays <= 60) urgents++;
        }
        if (c.montant_marche) {
          totaleMarches += Number(c.montant_marche);
          if (c.budget === 'Principale') principale += Number(c.montant_marche);
          else if (c.budget === 'Annexe') annexe += Number(c.montant_marche);
        }
      });

      setStats({ prestataires: countPrest || 0, contrats: contrats.length, urgents, echus });
      setEnveloppesMarches({ totale: totaleMarches, principale, annexe });
      setPieData([
        { name: 'Principale', value: principale, color: PIE_COLORS[0] },
        { name: 'Annexe', value: annexe, color: PIE_COLORS[1] },
      ].filter(item => item.value > 0));
      
      setUrgentContrats(contrats.filter(c => {
        if (!c.date_fin) return false;
        return Math.ceil((new Date(c.date_fin).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) <= 60;
      }).slice(0, 5));
    }

    // 2. Budgets Votés de l'année sélectionnée
    const { data: bvData } = await supabase.from('budgets_votes').select('*').eq('annee', anneeSelectionnee);
    setBudgetsVotes(bvData || []);

    // 3. DÉPENSES RÉELLES de l'année sélectionnée
    const { data: depData } = await supabase.from('depenses').select('montant_ttc, categorie_budget, sous_categorie').eq('annee_imputation', anneeSelectionnee);
    
    let pF = 0, pI = 0, aF = 0, aI = 0, regie = 0, totalDep = 0;
    if (depData) {
      depData.forEach((d: any) => {
        const montant = Number(d.montant_ttc) || 0;
        totalDep += montant;
        
        if (d.categorie_budget === 'Principale') {
          if (d.sous_categorie === 'Fonctionnement') pF += montant;
          else if (d.sous_categorie === 'Investissement') pI += montant;
        } else if (d.categorie_budget === 'Annexe') {
          if (d.sous_categorie === 'Fonctionnement') aF += montant;
          else if (d.sous_categorie === 'Investissement') aI += montant;
        } else if (d.categorie_budget === 'Régie d\'avance') {
          regie += montant;
        }
      });
    }
    setDepensesReelles({ principaleFonc: pF, principaleInvest: pI, annexeFonc: aF, annexeInvest: aI, regie, total: totalDep });

    setLoading(false);
  };

  const getComparaison = (type: string, cat: string, depense: number) => {
    const bv = budgetsVotes.find(b => b.type_budget === type && b.categorie === cat);
    const vote = bv ? Number(bv.montant_ttc) : 0;
    const pct = vote > 0 ? Math.min(Math.round((depense / vote) * 100), 100) : 0;
    return { label: `${type} - ${cat}`, vote, depense, pct };
  };

  const lignesComparaison = [
    getComparaison('Principale', 'Fonctionnement', depensesReelles.principaleFonc),
    getComparaison('Principale', 'Investissement', depensesReelles.principaleInvest),
    getComparaison('Annexe', 'Fonctionnement', depensesReelles.annexeFonc),
    getComparaison('Annexe', 'Investissement', depensesReelles.annexeInvest),
  ];

  const totalBudgetVoté = budgetsVotes.reduce((sum, b) => sum + Number(b.montant_ttc), 0);
  const resteGlobal = Math.max(0, totalBudgetVoté - depensesReelles.total);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-indigo-600 dark:text-indigo-400 font-medium animate-pulse flex items-center gap-2">
        <TrendingUp className="w-5 h-5 animate-spin" /> Chargement...
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-8 shadow-sm sticky top-0 z-10">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Tableau de Bord Financier</h1>
          <div className="flex items-center gap-4">
            {/* SÉLECTEUR D'ANNÉE */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
              <Calendar className="w-4 h-4 text-slate-500" />
              <select 
                value={anneeSelectionnee} 
                onChange={(e) => setAnneeSelectionnee(parseInt(e.target.value))}
                className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button className="relative rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500"></span>
            </button>
          </div>
        </header>

        <div className="p-8 space-y-8">
          
          {/* 1. KPI GLOBAUX */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard title="Budget Voté" value={formatEuro(totalBudgetVoté)} icon={<Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />} color="bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-l-indigo-500" delay={0} />
            <KPICard title="Dépensé Réel" value={formatEuro(depensesReelles.total)} icon={<TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />} color="bg-rose-50 dark:bg-rose-900/30 border-l-4 border-l-rose-500" delay={0.1} />
            <KPICard title="Reste Disponible" value={formatEuro(resteGlobal)} icon={<CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />} color="bg-emerald-50 dark:bg-emerald-900/30 border-l-4 border-l-emerald-500" delay={0.2} />
            <KPICard title="Enveloppe Marchés (Stock)" value={formatEuro(enveloppesMarches.totale)} icon={<FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />} color="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500" delay={0.3} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* 2. EXÉCUTION BUDGÉTAIRE (Grosses écritures) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="lg:col-span-2 bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center gap-2 mb-6">
                <TrendingDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Exécution Budgétaire {anneeSelectionnee}</h2>
              </div>

              <div className="space-y-8">
                {lignesComparaison.map((line, i) => {
                  const barColor = line.pct >= 90 ? 'bg-rose-500' : line.pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
                  const alertColor = line.pct >= 90 ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20' : line.pct >= 70 ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20';
                  
                  return (
                    <div key={i}>
                      <div className="flex justify-between items-end mb-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-base">{line.label}</span>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-slate-600 dark:text-slate-400">Voté: <strong className="text-slate-900 dark:text-white text-base">{formatEuro(line.vote)}</strong></span>
                          <span className="text-slate-600 dark:text-slate-400">Dépensé: <strong className="text-slate-900 dark:text-white text-base">{formatEuro(line.depense)}</strong></span>
                          <span className={`px-2.5 py-1 rounded-lg font-black text-sm ${alertColor}`}>{line.pct}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden shadow-inner">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${line.pct}%` }} transition={{ duration: 1, delay: 0.2 + i * 0.1 }}
                          className={`h-4 rounded-full ${barColor}`}
                        />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-right font-medium">
                        Reste à engager: <strong className="text-slate-800 dark:text-slate-200 text-base">{formatEuro(Math.max(0, line.vote - line.depense))}</strong>
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* 3. ENVELOPPES MARCHÉS */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Enveloppes Marchés</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Valeur totale des contrats (Stock).</p>

              <div className="flex-1 flex flex-col items-center justify-center min-h-[250px]">
                {pieData.length === 0 ? (
                  <div className="text-slate-400 italic">Aucun marché enregistré</div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                        {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [formatEuro(value), '']} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: '600' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="mt-4 text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Total Engagé</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{formatEuro(enveloppesMarches.totale)}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* 4. RÉGIE D'AVANCE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 p-6 rounded-2xl shadow-sm border border-orange-200 dark:border-orange-800/50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                  <PiggyBank className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-orange-900 dark:text-orange-200">Régie d'Avance - {anneeSelectionnee}</h2>
                  <p className="text-sm text-orange-700 dark:text-orange-400">Suivi des remboursements. <span className="font-semibold">Ne s'impute pas sur les budgets Principale/Annexe.</span></p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">Total Remboursé / Dépensé</p>
                <p className="text-3xl font-black text-orange-700 dark:text-orange-300">{formatEuro(depensesReelles.regie)}</p>
              </div>
            </div>
          </motion.div>

          {/* 5. ACTIONS REQUISES */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800"
          >
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Marchés à surveiller
            </h2>
            <div className="space-y-3">
              {urgentContrats.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4 bg-slate-50 dark:bg-slate-900 rounded-xl">Aucune urgence. Tous les marchés sont en règle. 🎉</p>
              ) : (
                urgentContrats.map(c => {
                  const days = Math.ceil((new Date(c.date_fin).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{c.nom_marche || c.objet}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Fin: {new Date(c.date_fin).toLocaleDateString('fr-FR')} • {formatEuro(c.montant_marche || 0)}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${days < 0 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                        {days < 0 ? `Échu depuis ${Math.abs(days)}j` : `Échéance dans ${days}j`}
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
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`bg-white dark:bg-slate-950 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 ${color} flex items-center gap-4 hover:shadow-md transition-shadow`}
    >
      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 shadow-sm">{icon}</div>
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">{title}</p>
        <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{value}</p>
      </div>
    </motion.div>
  );
}