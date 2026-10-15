'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Sidebar from '../../components/Sidebar';
import PeriodesClotureSection from '../../components/PeriodesClotureSection';
import { Archive, Download, Calendar, Loader2, FileSpreadsheet } from 'lucide-react';
import { motion } from 'framer-motion';

interface DepenseExport {
  id: string;
  date_imputation: string;
  prestataire_societe: string;
  objet: string;
  montant_ttc: number;
  categorie_budget: string;
  imputation: string;
}

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function CloturesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [depenses, setDepenses] = useState<DepenseExport[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role === 'lecture') {
        router.push('/dashboard');
        return;
      }

      fetchRecentDepenses();
    };
    checkAuth();
  }, [router]);

  const fetchRecentDepenses = async () => {
    try {
      const { data, error } = await supabase
        .from('depenses')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Erreur fetch depenses:', error.message, error.details, error.hint);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const formatted = data.slice(0, 5).map((d: any) => ({
          id: d.id,
          date_imputation: d.created_at || '',
          prestataire_societe: 'À définir',
          objet: d.objet || d.designation || d.description || 'Sans objet',
          montant_ttc: d.montant_ttc || d.montant || 0,
          categorie_budget: d.categorie_budget || 'N/A',
          imputation: d.imputation || 'N/A',
        }));
        setDepenses(formatted);
      }
    } catch (err) {
      console.error('Exception fetchRecentDepenses:', err);
    }
    setLoading(false);
  };

  const handleExportDepensesCsv = async () => {
    if (!startDate || !endDate) {
      alert('⚠️ Veuillez sélectionner une date de début et une date de fin.');
      return;
    }
    if (startDate > endDate) {
      alert('⚠️ La date de début doit être antérieure ou égale à la date de fin.');
      return;
    }

    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('depenses')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erreur Supabase:', error.message, error.details, error.hint);
        throw new Error(error.message || 'Erreur Supabase inconnue');
      }

      if (!data || data.length === 0) {
        alert('ℹ️ Aucune dépense trouvée sur cette période.');
        return;
      }

      const headers = ['Date', 'Objet', 'Montant TTC (€)', 'Catégorie', 'Imputation'];
      const rows = data.map((d: any) => [
        d.created_at ? new Date(d.created_at).toLocaleDateString('fr-FR') : '',
        d.objet || d.designation || d.description || 'Sans objet',
        (d.montant_ttc || d.montant || 0).toFixed(2).replace('.', ','),
        d.categorie_budget || 'N/A',
        d.imputation || 'N/A',
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => escapeCsvField(String(cell))).join(','))
        .join('\r\n');

      downloadCsv(`gesta-depenses_${startDate}_au_${endDate}.csv`, csvContent);
    } catch (error: any) {
      console.error('Erreur export:', error);
      alert('❌ Erreur lors de l\'export : ' + (error.message || 'Erreur inconnue'));
    } finally {
      setExporting(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-indigo-600 dark:text-indigo-400 font-medium animate-pulse flex flex-col items-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        Chargement...
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-8 shadow-sm sticky top-0 z-10">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Archive className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Clôtures & Exports
          </h1>
        </header>

        <div className="p-8 max-w-6xl mx-auto space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4 }}
            className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6"
          >
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Gestion des périodes comptables
            </h2>
            <PeriodesClotureSection />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6"
          >
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Export des dépenses
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Téléchargez l'historique des dépenses au format CSV pour vos rapports comptables ou vos archivages.
            </p>

            <div className="flex flex-wrap items-end gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date de début</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date de fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <button
                onClick={handleExportDepensesCsv}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white font-semibold transition-colors shadow-sm"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {exporting ? 'Génération...' : 'Exporter en CSV'}
              </button>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Aperçu des dernières dépenses chargées ({depenses.length})
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600 dark:text-slate-400">Date</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600 dark:text-slate-400">Prestataire</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600 dark:text-slate-400">Objet</th>
                      <th className="px-4 py-2 text-right font-semibold text-slate-600 dark:text-slate-400">Montant TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                    {depenses.slice(0, 5).map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                          {d.date_imputation ? new Date(d.date_imputation).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">{d.prestataire_societe}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400 truncate max-w-xs">{d.objet}</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                          {d.montant_ttc.toFixed(2).replace('.', ',')} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}