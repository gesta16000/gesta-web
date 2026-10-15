'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Sidebar from '../../components/Sidebar';
import PeriodesClotureSection from '../../components/PeriodesClotureSection';
import { Archive, Download, Calendar, Loader2, FileSpreadsheet, Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface DepenseExport {
  id: string;
  date_depense: string;
  designation: string;
  montant_ttc: number;
  categorie_budget: string;
  sous_categorie: string;
  nature: string;
  type_depense: string;
  societe_libre: string;
  contrats?: {
    prestataires?: {
      societe: string;
    };
  };
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
  
  // NOUVEAU : Gestion des onglets pour l'export
  const [activeTab, setActiveTab] = useState<'budgetaires' | 'regie'>('budgetaires');
  const [searchBudget, setSearchBudget] = useState('');
  const [searchRegie, setSearchRegie] = useState('');

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
        .select(`
          *,
          contrats (
            prestataires (
              societe
            )
          )
        `)
        .order('date_depense', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Erreur fetch depenses:', error.message, error.details, error.hint);
        setLoading(false);
        return;
      }

      if (data) {
        setDepenses(data as any);
      }
    } catch (err) {
      console.error('Exception fetchRecentDepenses:', err);
    }
    setLoading(false);
  };

  // Filtrage par onglet
  const depensesBudgetaires = depenses.filter(d => 
    d.categorie_budget === 'Principale' || d.categorie_budget === 'Annexe'
  );
  
  const depensesRegie = depenses.filter(d => 
    d.categorie_budget === 'Régie d\'avance'
  );

  // Filtrage par recherche
  const filteredBudgetaires = depensesBudgetaires.filter(d => {
    return searchBudget === '' || 
      d.designation?.toLowerCase().includes(searchBudget.toLowerCase()) ||
      d.nature?.toLowerCase().includes(searchBudget.toLowerCase());
  });

  const filteredRegie = depensesRegie.filter(d => {
    return searchRegie === '' || 
      d.designation?.toLowerCase().includes(searchRegie.toLowerCase()) ||
      d.nature?.toLowerCase().includes(searchRegie.toLowerCase());
  });

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
      // Récupérer les dépenses sur la plage sélectionnée
      const { data, error } = await supabase
        .from('depenses')
        .select(`
          *,
          contrats (
            prestataires (
              societe
            )
          )
        `)
        .gte('date_depense', startDate)
        .lte('date_depense', endDate)
        .order('date_depense', { ascending: true });

      if (error) {
        console.error('Erreur Supabase:', error.message, error.details, error.hint);
        throw new Error(error.message || 'Erreur Supabase inconnue');
      }

      if (!data || data.length === 0) {
        alert('ℹ️ Aucune dépense trouvée sur cette période.');
        return;
      }

      // NOUVEAU : Filtrer selon l'onglet actif
      let filteredData = data;
      if (activeTab === 'budgetaires') {
        filteredData = data.filter((d: any) => 
          d.categorie_budget === 'Principale' || d.categorie_budget === 'Annexe'
        );
      } else {
        filteredData = data.filter((d: any) => 
          d.categorie_budget === 'Régie d\'avance'
        );
      }

      if (filteredData.length === 0) {
        alert('ℹ️ Aucune dépense trouvée pour cet onglet sur cette période.');
        return;
      }

      // NOUVEAU : Colonnes enrichies (Date, Prestataire, Budget, Section, Nature, Désignation, Montant TTC)
      const headers = ['Date', 'Prestataire', 'Budget', 'Section', 'Nature', 'Désignation', 'Montant TTC (€)'];
      const rows = filteredData.map((d: any) => [
        d.date_depense ? new Date(d.date_depense).toLocaleDateString('fr-FR') : '',
        d.type_depense === 'marche' 
          ? (d.contrats?.prestataires?.societe || 'N/A') 
          : (d.societe_libre || 'N/A'),
        d.categorie_budget || 'N/A',
        d.sous_categorie || 'N/A',
        d.nature || 'N/A',
        d.designation || 'Sans objet',
        (d.montant_ttc || 0).toFixed(2).replace('.', ','),
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => escapeCsvField(String(cell))).join(','))
        .join('\r\n');

      const tabLabel = activeTab === 'budgetaires' ? 'budgetaires' : 'regie-avance';
      downloadCsv(`gesta-depenses-${tabLabel}_${startDate}_au_${endDate}.csv`, csvContent);
    } catch (error: any) {
      console.error('Erreur export:', error);
      alert('❌ Erreur lors de l\'export : ' + (error.message || 'Erreur inconnue'));
    } finally {
      setExporting(false);
    }
  };

  const formatEuro = (montant: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(montant);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-indigo-600 dark:text-indigo-400 font-medium animate-pulse flex flex-col items-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        Chargement...
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 transition-colors">
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
            className="bg-white dark:bg-slate-950 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 p-6"
          >
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Gestion des périodes comptables
            </h2>
            <PeriodesClotureSection />
          </motion.div>

          {/* SECTION EXPORT AVEC ONGLETS */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white dark:bg-slate-950 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Export des dépenses
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Téléchargez l'historique des dépenses au format CSV pour vos rapports comptables ou vos archivages.
              </p>
            </div>

            {/* Onglets */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <button
                onClick={() => setActiveTab('budgetaires')}
                className={`flex-1 px-6 py-3 text-sm font-bold transition-all border-b-2 ${
                  activeTab === 'budgetaires'
                    ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-950'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>📊 Dépenses budgétaires</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'budgetaires' 
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                  }`}>
                    {filteredBudgetaires.length} • {formatEuro(filteredBudgetaires.reduce((sum, d) => sum + Number(d.montant_ttc), 0))}
                  </span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('regie')}
                className={`flex-1 px-6 py-3 text-sm font-bold transition-all border-b-2 ${
                  activeTab === 'regie'
                    ? 'border-orange-600 text-orange-700 dark:text-orange-400 bg-white dark:bg-slate-950'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>🟠 Régie d'avance</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'regie' 
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                  }`}>
                    {filteredRegie.length} • {formatEuro(filteredRegie.reduce((sum, d) => sum + Number(d.montant_ttc), 0))}
                  </span>
                </div>
              </button>
            </div>

            {/* Contenu de l'onglet */}
            <div className="p-6">
              {/* Sélecteurs de dates et bouton export */}
              <div className="flex flex-wrap items-end gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 mb-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date de début</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date de fin</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                  {exporting ? 'Génération...' : `Exporter ${activeTab === 'budgetaires' ? 'budget' : 'régie'} en CSV`}
                </button>
              </div>

              {/* Aperçu selon l'onglet actif */}
              {activeTab === 'budgetaires' ? (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      Aperçu des dépenses budgétaires ({filteredBudgetaires.length})
                    </h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchBudget}
                        onChange={(e) => setSearchBudget(e.target.value)}
                        className="w-64 pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                      <thead className="bg-slate-100 dark:bg-slate-900">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Date</th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Prestataire</th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Budget</th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Section</th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Nature</th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Désignation</th>
                          <th className="px-4 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">Montant TTC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                        {filteredBudgetaires.slice(0, 10).map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                            <td className="px-4 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {d.date_depense ? new Date(d.date_depense).toLocaleDateString('fr-FR') : '-'}
                            </td>
                            <td className="px-4 py-2 text-slate-800 dark:text-slate-200">
                              {d.type_depense === 'marche' 
                                ? (d.contrats?.prestataires?.societe || 'N/A')
                                : (d.societe_libre || 'N/A')}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                d.categorie_budget === 'Principale' 
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              }`}>
                                {d.categorie_budget}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{d.sous_categorie || 'N/A'}</td>
                            <td className="px-4 py-2 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{d.nature}</td>
                            <td className="px-4 py-2 text-slate-800 dark:text-slate-200 truncate max-w-xs">{d.designation}</td>
                            <td className="px-4 py-2 text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                              {formatEuro(d.montant_ttc)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-indigo-50 dark:bg-slate-900 border-t-2 border-indigo-200 dark:border-indigo-800">
                        <tr>
                          <td colSpan={6} className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 text-right">Total :</td>
                          <td className="px-4 py-2 text-right font-black text-lg text-indigo-700 dark:text-indigo-300">
                            {formatEuro(filteredBudgetaires.reduce((sum, d) => sum + Number(d.montant_ttc), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      Aperçu de la régie d'avance ({filteredRegie.length})
                    </h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Rechercher dans la régie..."
                        value={searchRegie}
                        onChange={(e) => setSearchRegie(e.target.value)}
                        className="w-64 pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-orange-200 dark:border-orange-800">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                      <thead className="bg-orange-50 dark:bg-slate-900">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Date</th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Prestataire</th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Nature</th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Désignation</th>
                          <th className="px-4 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">Montant TTC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                        {filteredRegie.slice(0, 10).map((d) => (
                          <tr key={d.id} className="hover:bg-orange-50 dark:hover:bg-orange-900/10">
                            <td className="px-4 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {d.date_depense ? new Date(d.date_depense).toLocaleDateString('fr-FR') : '-'}
                            </td>
                            <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{d.societe_libre || 'N/A'}</td>
                            <td className="px-4 py-2 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{d.nature}</td>
                            <td className="px-4 py-2 text-slate-800 dark:text-slate-200 truncate max-w-xs">{d.designation}</td>
                            <td className="px-4 py-2 text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                              {formatEuro(d.montant_ttc)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-orange-50 dark:bg-orange-900/10 border-t-2 border-orange-200 dark:border-orange-800">
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 text-right">Total :</td>
                          <td className="px-4 py-2 text-right font-black text-lg text-orange-600 dark:text-orange-400">
                            {formatEuro(filteredRegie.reduce((sum, d) => sum + Number(d.montant_ttc), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}