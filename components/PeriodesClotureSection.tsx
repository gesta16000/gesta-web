'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Unlock, Loader2, ShieldAlert, FileSpreadsheet } from 'lucide-react';
import { motion } from 'framer-motion';
import type { PeriodeCloture } from '../types/admin';
import { getErrorMessage } from '../lib/error';

const MOIS_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function formatPeriodeLabel(periode: Pick<PeriodeCloture, 'annee' | 'mois'>): string {
  return periode.mois ? `${MOIS_LABELS[periode.mois - 1]} ${periode.annee}` : `Année ${periode.annee}`;
}

export default function PeriodesClotureSection() {
  const currentYear = new Date().getFullYear();

  const [periodes, setPeriodes] = useState<PeriodeCloture[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [selectedAnnee, setSelectedAnnee] = useState(currentYear);
  const [selectedMois, setSelectedMois] = useState<string>(''); 

  // NOUVEAU : Gestion des onglets et aperçu
  const [activeTab, setActiveTab] = useState<'budgetaire' | 'regie'>('budgetaire');
  const [previewDepenses, setPreviewDepenses] = useState<any[]>([]);

  const [unlockTarget, setUnlockTarget] = useState<PeriodeCloture | null>(null);
  const [unlockReason, setUnlockReason] = useState('');

  const years = Array.from({ length: 6 }, (_, i) => currentYear - 4 + i);

  const fetchPeriodes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/periodes');
      const json = await res.json();
      if (res.ok && json.success) {
        setPeriodes(json.data as PeriodeCloture[]);
      } else {
        alert('Erreur : ' + (json.error || 'Impossible de charger les périodes'));
      }
    } catch (error: unknown) {
      alert('Erreur réseau : ' + getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // NOUVEAU : Récupérer l'aperçu des dépenses pour la période et l'onglet sélectionnés
  const fetchPreviewDepenses = async () => {
    try {
      const { data } = await supabase
        .from('depenses')
        .select('date_depense, designation, montant_ttc, categorie_budget')
        .eq('annee_imputation', selectedAnnee);

      if (data) {
        let filtered = data;
        
        // Filtrer par mois si sélectionné
        if (selectedMois) {
          const moisNum = parseInt(selectedMois);
          filtered = filtered.filter(d => {
            const date = new Date(d.date_depense);
            return date.getMonth() + 1 === moisNum;
          });
        }

        // Filtrer par type de régie selon l'onglet actif
        if (activeTab === 'budgetaire') {
          filtered = filtered.filter(d => d.categorie_budget === 'Principale' || d.categorie_budget === 'Annexe');
        } else {
          filtered = filtered.filter(d => d.categorie_budget === 'Régie d\'avance');
        }

        setPreviewDepenses(filtered);
      }
    } catch (error) {
      console.error('Erreur aperçu dépenses:', error);
    }
  };

  useEffect(() => {
    void (async () => {
      await fetchPeriodes();
    })();
  }, []);

  // Mettre à jour l'aperçu quand la période ou l'onglet change
  useEffect(() => {
    fetchPreviewDepenses();
  }, [selectedAnnee, selectedMois, activeTab]);

  const findPeriode = (annee: number, mois: number | null): PeriodeCloture | undefined =>
    periodes.find((p) => p.annee === annee && p.mois === mois);

  // On vérifie si la période est clôturée (la logique backend devra peut-être être adaptée pour gérer le type)
  const currentSelection = findPeriode(selectedAnnee, selectedMois === '' ? null : Number(selectedMois));
  const isCurrentSelectionCloturee = currentSelection?.statut === 'cloture';

  const handleCloturer = async () => {
    const moisNum = selectedMois === '' ? null : Number(selectedMois);
    const label = formatPeriodeLabel({ annee: selectedAnnee, mois: moisNum });
    const typeLabel = activeTab === 'budgetaire' ? 'les dépenses budgétaires' : 'la régie d\'avance';

    if (!window.confirm(`Clôturer ${typeLabel} pour la période "${label}" ?\n\nCela bloquera toute modification sur ces écritures spécifiques.`)) {
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/periodes/cloturer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          annee: selectedAnnee, 
          mois: moisNum,
          type_cloture: activeTab // NOUVEAU : On indique au backend quel type on clôture
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await fetchPeriodes();
      } else {
        alert('Erreur : ' + (json.error || 'Échec de la clôture'));
      }
    } catch (error: unknown) {
      alert('Erreur réseau : ' + getErrorMessage(error));
    } finally {
      setProcessing(false);
    }
  };

  const openUnlockModal = (periode: PeriodeCloture) => {
    setUnlockTarget(periode);
    setUnlockReason('');
  };

  const handleDeverrouiller = async () => {
    if (!unlockTarget) return;
    if (!unlockReason.trim()) {
      alert('La raison du déverrouillage est obligatoire.');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/periodes/deverrouiller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          annee: unlockTarget.annee, 
          mois: unlockTarget.mois, 
          raison: unlockReason.trim() 
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setUnlockTarget(null);
        setUnlockReason('');
        await fetchPeriodes();
      } else {
        alert('Erreur : ' + (json.error || 'Échec du déverrouillage'));
      }
    } catch (error: unknown) {
      alert('Erreur réseau : ' + getErrorMessage(error));
    } finally {
      setProcessing(false);
    }
  };

  const totalApercu = previewDepenses.reduce((sum, d) => sum + Number(d.montant_ttc), 0);
  const formatEuro = (montant: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(montant);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white dark:bg-slate-950 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden"
    >
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Clôtures comptables
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Une période clôturée bloque toute création, modification ou suppression des écritures rattachées.
        </p>
      </div>

      {/* Sélecteurs de période */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-end gap-4 bg-white dark:bg-slate-950">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Année</label>
          <select
            value={selectedAnnee}
            onChange={(e) => setSelectedAnnee(Number(e.target.value))}
            className="text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Mois (optionnel)</label>
          <select
            value={selectedMois}
            onChange={(e) => setSelectedMois(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">Année entière</option>
            {MOIS_LABELS.map((label, i) => <option key={i + 1} value={i + 1}>{label}</option>)}
          </select>
        </div>

        {isCurrentSelectionCloturee ? (
          <button
            onClick={() => currentSelection && openUnlockModal(currentSelection)}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold transition-colors"
          >
            <Unlock className="w-4 h-4" /> Déverrouiller cette période
          </button>
        ) : (
          <button
            onClick={handleCloturer}
            disabled={processing || previewDepenses.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} 
            Clôturer {activeTab === 'budgetaire' ? 'le budget' : 'la régie'}
          </button>
        )}
      </div>

      {/* Onglets d'aperçu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <button
          onClick={() => setActiveTab('budgetaire')}
          className={`flex-1 px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === 'budgetaire'
              ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-950'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span>📊 Dépenses budgétaires</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'budgetaire' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30' : 'bg-slate-200 text-slate-600 dark:bg-slate-700'}`}>
              {previewDepenses.length} lignes
            </span>
          </div>
        </button>
        
        <button
          onClick={() => setActiveTab('regie')}
          className={`flex-1 px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === 'regie'
              ? 'border-orange-600 text-orange-700 dark:text-orange-400 bg-white dark:bg-slate-950'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span>🟠 Régie d'avance</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'regie' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30' : 'bg-slate-200 text-slate-600 dark:bg-slate-700'}`}>
              {previewDepenses.length} lignes
            </span>
          </div>
        </button>
      </div>

      {/* Contenu de l'onglet actif : Aperçu des dépenses */}
      <div className="p-6 bg-white dark:bg-slate-950">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Aperçu des écritures à clôturer
          </h3>
          <span className="text-sm font-black text-slate-900 dark:text-white">
            Total : {formatEuro(totalApercu)}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead className="bg-slate-100 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-slate-600 dark:text-slate-400">Date</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600 dark:text-slate-400">Désignation</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600 dark:text-slate-400">Catégorie</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-600 dark:text-slate-400">Montant TTC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
              {previewDepenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 italic">
                    Aucune écriture trouvée pour cette sélection.
                  </td>
                </tr>
              ) : (
                previewDepenses.map((d, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {d.date_depense ? new Date(d.date_depense).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="px-4 py-2 text-slate-800 dark:text-slate-200 truncate max-w-xs">{d.designation}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                        d.categorie_budget === 'Principale' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                        d.categorie_budget === 'Annexe' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                      }`}>
                        {d.categorie_budget}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatEuro(d.montant_ttc)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tableau récapitulatif des périodes déjà traitées */}
      <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">Historique des clôtures</h3>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-4">Chargement...</p>
          ) : periodes.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Aucune période clôturée pour le moment.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Période</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Statut</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Clôturée le</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Dernier déverrouillage</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {periodes.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{formatPeriodeLabel(p)}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.statut === 'cloture' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                        {p.statut === 'cloture' ? 'Clôturée' : 'Ouverte'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{p.cloture_a ? new Date(p.cloture_a).toLocaleString('fr-FR') : '-'}</td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {p.deverrouille_a ? <span title={p.raison_deverrouillage || ''}>{new Date(p.deverrouille_a).toLocaleString('fr-FR')}</span> : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {p.statut === 'cloture' && (
                        <button
                          onClick={() => openUnlockModal(p)}
                          disabled={processing}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 transition-colors disabled:opacity-50"
                        >
                          <Unlock className="w-3 h-3" /> Déverrouiller
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modale de déverrouillage */}
      {unlockTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setUnlockTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Déverrouiller la période</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{formatPeriodeLabel(unlockTarget)}</p>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Raison du déverrouillage *</label>
            <textarea
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              rows={3}
              placeholder="Ex : correction d'une erreur de saisie"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setUnlockTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                Annuler
              </button>
              <button
                onClick={handleDeverrouiller}
                disabled={processing || !unlockReason.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />} Déverrouiller
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}