
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Sidebar from '../../components/Sidebar';
import { Euro, Save, Loader2, CheckCircle2, TrendingUp, Briefcase, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

type BudgetKey = 'principale_fonct' | 'principale_invest' | 'annexe_fonct' | 'annexe_invest';

interface BudgetData {
  montant_ht: string;
  montant_ttc: string;
  editing: 'ht' | 'ttc' | null;
}

const TVA = 0.20;

const initialBudgets: Record<BudgetKey, BudgetData> = {
  principale_fonct: { montant_ht: '', montant_ttc: '', editing: null },
  principale_invest: { montant_ht: '', montant_ttc: '', editing: null },
  annexe_fonct: { montant_ht: '', montant_ttc: '', editing: null },
  annexe_invest: { montant_ht: '', montant_ttc: '', editing: null },
};

export default function BudgetsPage() {
  const router = useRouter();
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [budgets, setBudgets] = useState<Record<BudgetKey, BudgetData>>(initialBudgets);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // NOUVEAU : Rôle de l'utilisateur connecté
  const [userRole, setUserRole] = useState<string>('lecture');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      
      // NOUVEAU : On récupère le rôle de l'utilisateur
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (profile) setUserRole(profile.role || 'lecture');
      
      fetchBudgets();
    };
    checkAuth();
  }, [router, annee]);

  const fetchBudgets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('budgets_votes')
      .select('*')
      .eq('annee', annee);

    const newBudgets = { ...initialBudgets };
    if (data) {
      data.forEach((row: any) => {
        let key: BudgetKey | null = null;
        if (row.type_budget === 'Principale' && row.categorie === 'Fonctionnement') key = 'principale_fonct';
        else if (row.type_budget === 'Principale' && row.categorie === 'Investissement') key = 'principale_invest';
        else if (row.type_budget === 'Annexe' && row.categorie === 'Fonctionnement') key = 'annexe_fonct';
        else if (row.type_budget === 'Annexe' && row.categorie === 'Investissement') key = 'annexe_invest';

        if (key) {
          newBudgets[key] = {
            montant_ht: row.montant_ht ? row.montant_ht.toString() : '',
            montant_ttc: row.montant_ttc ? row.montant_ttc.toString() : '',
            editing: null,
          };
        }
      });
    }
    setBudgets(newBudgets);
    setLoading(false);
  };

  const handleChange = (key: BudgetKey, field: 'ht' | 'ttc', value: string) => {
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
    const updated = { ...budgets[key] };
    
    if (field === 'ht') {
      updated.montant_ht = cleaned;
      updated.editing = 'ht';
      const htNum = parseFloat(cleaned);
      updated.montant_ttc = !isNaN(htNum) && cleaned !== '' ? (htNum * (1 + TVA)).toFixed(2) : '';
    } else {
      updated.montant_ttc = cleaned;
      updated.editing = 'ttc';
      const ttcNum = parseFloat(cleaned);
      updated.montant_ht = !isNaN(ttcNum) && cleaned !== '' ? (ttcNum / (1 + TVA)).toFixed(2) : '';
    }
    
    setBudgets({ ...budgets, [key]: updated });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const rowsToUpsert = [
      { annee, type_budget: 'Principale', categorie: 'Fonctionnement', ...parseBudget(budgets.principale_fonct) },
      { annee, type_budget: 'Principale', categorie: 'Investissement', ...parseBudget(budgets.principale_invest) },
      { annee, type_budget: 'Annexe', categorie: 'Fonctionnement', ...parseBudget(budgets.annexe_fonct) },
      { annee, type_budget: 'Annexe', categorie: 'Investissement', ...parseBudget(budgets.annexe_invest) },
    ].filter(r => r.montant_ht !== null || r.montant_ttc !== null);

    if (rowsToUpsert.length === 0) {
      setMessage({ type: 'error', text: 'Aucun montant à enregistrer.' });
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('budgets_votes').upsert(rowsToUpsert, { onConflict: 'annee,type_budget,categorie' });

    setSaving(false);
    if (error) {
      setMessage({ type: 'error', text: 'Erreur : ' + error.message });
    } else {
      setMessage({ type: 'success', text: `Budgets ${annee} enregistrés avec succès ! ✅` });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const parseBudget = (b: BudgetData) => {
    const ht = b.montant_ht ? parseFloat(b.montant_ht) : null;
    const ttc = b.montant_ttc ? parseFloat(b.montant_ttc) : null;
    return {
      montant_ht: !isNaN(ht as number) ? ht : null,
      montant_ttc: !isNaN(ttc as number) ? ttc : null,
    };
  };

  const formatEuro = (value: string) => {
    if (!value) return '—';
    const num = parseFloat(value);
    if (isNaN(num)) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);
  };

  const totalHT = Object.values(budgets).reduce((sum, b) => sum + (parseFloat(b.montant_ht) || 0), 0);
  const totalTTC = Object.values(budgets).reduce((sum, b) => sum + (parseFloat(b.montant_ttc) || 0), 0);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-indigo-600 dark:text-indigo-400 font-medium animate-pulse flex items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Chargement des budgets...
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-8 shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Euro className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Budgets Votés
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Enveloppes annuelles de fonctionnement et d'investissement</p>
            </div>
            {/* NOUVEAU : Badge si lecture seule */}
            {userRole === 'lecture' && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold border border-slate-200 dark:border-slate-700">
                <Eye className="w-3.5 h-3.5" /> Lecture seule
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <select 
              value={annee} 
              onChange={(e) => setAnnee(parseInt(e.target.value))}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </header>

        <div className="p-8 max-w-5xl mx-auto">
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

          <div className="mb-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 flex items-start gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-lg">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-sm">
              <p className="font-semibold text-indigo-900 dark:text-indigo-300">Calcul automatique HT ↔ TTC</p>
              <p className="text-indigo-700 dark:text-indigo-400 text-xs mt-0.5">Saisissez le montant HT ou TTC, l'autre champ se calcule automatiquement (TVA 20%).</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden mb-6"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Budget Principal</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tous les montants sont exprimés en TTC</p>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <BudgetInput 
                label="Fonctionnement" 
                budgetKey="principale_fonct" 
                budgets={budgets} 
                onChange={handleChange} 
                formatEuro={formatEuro}
                color="indigo"
                isReadOnly={userRole === 'lecture'}
              />
              <BudgetInput 
                label="Investissement" 
                budgetKey="principale_invest" 
                budgets={budgets} 
                onChange={handleChange} 
                formatEuro={formatEuro}
                color="purple"
                isReadOnly={userRole === 'lecture'}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden mb-6"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 flex items-center gap-3">
              <div className="bg-emerald-600 p-2 rounded-lg">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Budget Annexe</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tous les montants sont exprimés en TTC</p>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <BudgetInput 
                label="Fonctionnement" 
                budgetKey="annexe_fonct" 
                budgets={budgets} 
                onChange={handleChange} 
                formatEuro={formatEuro}
                color="emerald"
                isReadOnly={userRole === 'lecture'}
              />
              <BudgetInput 
                label="Investissement" 
                budgetKey="annexe_invest" 
                budgets={budgets} 
                onChange={handleChange} 
                formatEuro={formatEuro}
                color="teal"
                isReadOnly={userRole === 'lecture'}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 rounded-2xl shadow-xl p-6 text-white mb-6"
          >
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Récapitulatif {annee}</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total HT</p>
                <p className="text-3xl font-bold">{formatEuro(totalHT.toFixed(2))}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total TTC</p>
                <p className="text-3xl font-bold text-indigo-400">{formatEuro(totalTTC.toFixed(2))}</p>
              </div>
            </div>
          </motion.div>

          {/* NOUVEAU : On cache le bouton Enregistrer si lecture seule */}
          {userRole !== 'lecture' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex justify-end"
            >
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Enregistrement...' : `Enregistrer les budgets ${annee}`}
              </button>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}

// NOUVEAU : Ajout de la prop isReadOnly
function BudgetInput({ label, budgetKey, budgets, onChange, formatEuro, color, isReadOnly }: any) {
  const budget = budgets[budgetKey];
  
  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-500 border-l-4 border-l-indigo-600 dark:border-l-indigo-400',
    purple: 'bg-purple-50 dark:bg-purple-900/40 border-purple-200 dark:border-purple-500 border-l-4 border-l-purple-600 dark:border-l-purple-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-500 border-l-4 border-l-emerald-600 dark:border-l-emerald-400',
    teal: 'bg-teal-50 dark:bg-teal-900/40 border-teal-200 dark:border-teal-500 border-l-4 border-l-teal-600 dark:border-l-teal-400',
  };

  const iconClasses: Record<string, string> = {
    indigo: 'text-indigo-600 dark:text-indigo-300',
    purple: 'text-purple-600 dark:text-purple-300',
    emerald: 'text-emerald-600 dark:text-emerald-300',
    teal: 'text-teal-600 dark:text-teal-300',
  };

  // Style spécifique pour les inputs désactivés
  const inputClasses = `w-full px-3 py-2 pr-12 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:cursor-not-allowed disabled:text-slate-500 dark:disabled:text-slate-500`;
  const inputClassesBold = `${inputClasses} font-semibold`;

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-1.5 rounded-lg bg-white dark:bg-slate-900 ${iconClasses[color]}`}>
          {color === 'indigo' || color === 'purple' ? <Briefcase className="w-4 h-4" /> : <Euro className="w-4 h-4" />}
        </div>
        <h3 className="font-bold text-slate-900 dark:text-slate-100">{label}</h3>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-wider">Montant HT</label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={budget.montant_ht}
              onChange={(e) => onChange(budgetKey, 'ht', e.target.value)}
              placeholder="0,00"
              disabled={isReadOnly}
              className={inputClasses}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500">€ HT</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-wider">Montant TTC (auto)</label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={budget.montant_ttc}
              onChange={(e) => onChange(budgetKey, 'ttc', e.target.value)}
              placeholder="0,00"
              disabled={isReadOnly}
              className={inputClassesBold}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500">€ TTC</span>
          </div>
        </div>
        {budget.montant_ttc && (
          <p className="text-xs text-slate-500 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-700">
            Soit <span className="font-bold text-slate-900 dark:text-white">{formatEuro(budget.montant_ttc)}</span> TTC
          </p>
        )}
      </div>
    </div>
  );
}