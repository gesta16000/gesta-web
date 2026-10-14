'use client';

import { useEffect, useState } from 'react';
import { Lock, Unlock, Loader2, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import type { PeriodeCloture } from '../types/admin';
import { getErrorMessage } from '../lib/error';

const MOIS_LABELS = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

function formatPeriodeLabel(periode: Pick<PeriodeCloture, 'annee' | 'mois'>): string {
  return periode.mois ? `${MOIS_LABELS[periode.mois - 1]} ${periode.annee}` : `Annee ${periode.annee}`;
}

/**
 * Section d'administration des clotures comptables : permet de cloturer ou
 * deverrouiller une periode (annee complete ou mois precis), et affiche
 * l'historique des periodes deja traitees.
 */
export default function PeriodesClotureSection() {
  const currentYear = new Date().getFullYear();

  const [periodes, setPeriodes] = useState<PeriodeCloture[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [selectedAnnee, setSelectedAnnee] = useState(currentYear);
  const [selectedMois, setSelectedMois] = useState<string>(''); // '' = cloture annuelle

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
        alert('Erreur : ' + (json.error || 'Impossible de charger les periodes'));
      }
    } catch (error: unknown) {
      alert('Erreur reseau : ' + getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // setLoading/setPeriodes sont appeles de maniere asynchrone (apres le
    // premier `await`), pas de facon synchrone dans le corps de l'effet.
    void (async () => {
      await fetchPeriodes();
    })();
  }, []);

  const findPeriode = (annee: number, mois: number | null): PeriodeCloture | undefined =>
    periodes.find((p) => p.annee === annee && p.mois === mois);

  const currentSelection = findPeriode(selectedAnnee, selectedMois === '' ? null : Number(selectedMois));
  const isCurrentSelectionCloturee = currentSelection?.statut === 'cloture';

  const handleCloturer = async () => {
    const moisNum = selectedMois === '' ? null : Number(selectedMois);
    const label = formatPeriodeLabel({ annee: selectedAnnee, mois: moisNum });

    if (!window.confirm(`Cloturer la periode "${label}" ? Toute modification des depenses et contrats rattaches a cette periode sera bloquee.`)) {
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/periodes/cloturer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annee: selectedAnnee, mois: moisNum }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await fetchPeriodes();
      } else {
        alert('Erreur : ' + (json.error || 'Echec de la cloture'));
      }
    } catch (error: unknown) {
      alert('Erreur reseau : ' + getErrorMessage(error));
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
      alert('La raison du deverrouillage est obligatoire.');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/periodes/deverrouiller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annee: unlockTarget.annee, mois: unlockTarget.mois, raison: unlockReason.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setUnlockTarget(null);
        setUnlockReason('');
        await fetchPeriodes();
      } else {
        alert('Erreur : ' + (json.error || 'Echec du deverrouillage'));
      }
    } catch (error: unknown) {
      alert('Erreur reseau : ' + getErrorMessage(error));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 1.0 }}
      className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mb-8"
    >
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Clotures comptables
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Une periode cloturee bloque toute creation, modification ou suppression des depenses et marches qui s&apos;y rattachent.
      </p>

      <div className="flex flex-wrap items-end gap-2 mb-6 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Annee</label>
          <select
            value={selectedAnnee}
            onChange={(e) => setSelectedAnnee(Number(e.target.value))}
            className="text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Mois (optionnel)</label>
          <select
            value={selectedMois}
            onChange={(e) => setSelectedMois(e.target.value)}
            className="text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="">Annee entiere</option>
            {MOIS_LABELS.map((label, i) => <option key={i + 1} value={i + 1}>{label}</option>)}
          </select>
        </div>

        {isCurrentSelectionCloturee ? (
          <button
            onClick={() => currentSelection && openUnlockModal(currentSelection)}
            disabled={processing}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          >
            <Unlock className="w-3.5 h-3.5" /> Deverrouiller cette periode
          </button>
        ) : (
          <button
            onClick={handleCloturer}
            disabled={processing}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          >
            {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />} Cloturer cette periode
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Chargement des periodes...</p>
        ) : periodes.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Aucune periode cloturee pour le moment.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Periode</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Statut</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Cloturee le</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Dernier deverrouillage</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {periodes.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 dark:border-slate-900">
                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{formatPeriodeLabel(p)}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.statut === 'cloture' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                      {p.statut === 'cloture' ? 'Cloturee' : 'Ouverte'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                    {p.cloture_a ? new Date(p.cloture_a).toLocaleString('fr-FR') : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                    {p.deverrouille_a ? (
                      <span title={p.raison_deverrouillage || ''}>{new Date(p.deverrouille_a).toLocaleString('fr-FR')}</span>
                    ) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {p.statut === 'cloture' && (
                      <button
                        onClick={() => openUnlockModal(p)}
                        disabled={processing}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 transition-colors disabled:opacity-50"
                      >
                        <Unlock className="w-3 h-3" /> Deverrouiller
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {unlockTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setUnlockTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Deverrouiller la periode</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{formatPeriodeLabel(unlockTarget)}</p>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Raison du deverrouillage *</label>
            <textarea
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              rows={3}
              placeholder="Ex : correction d'une erreur de saisie sur la facture"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setUnlockTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                Annuler
              </button>
              <button
                onClick={handleDeverrouiller}
                disabled={processing || !unlockReason.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />} Deverrouiller
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
