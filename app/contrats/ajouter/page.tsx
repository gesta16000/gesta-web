'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Sidebar from '../../../components/Sidebar';
import { ArrowLeft, Save } from 'lucide-react';

export default function AjouterContratPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prestataireIdFromUrl = searchParams.get('prestataire_id');

  const [prestataires, setPrestataires] = useState<any[]>([]);
  const [selectedPrestataire, setSelectedPrestataire] = useState(prestataireIdFromUrl || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchPrestataires = async () => {
      const { data } = await supabase.from('prestataires').select('id, societe').order('societe');
      if (data) setPrestataires(data);
    };
    fetchPrestataires();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const formData = new FormData(e.currentTarget);
    const montantStr = (formData.get('montant_marche') as string || '').replace(/\s/g, '').replace(',', '.');
    const montant = montantStr ? parseFloat(montantStr) : null;
    const interventionsPrevues = formData.get('interventions_prevues') ? parseInt(formData.get('interventions_prevues') as string) : 0;

    const { error } = await supabase.from('contrats').insert({
      prestataire_id: selectedPrestataire,
      nom_marche: formData.get('nom_marche'),
      numero_tiers: formData.get('numero_tiers'),
      budget: formData.get('budget'),
      section: formData.get('section'),
      imputation: formData.get('imputation'),
      montant_marche: montant,
      interventions_prevues: interventionsPrevues,
      type_contrat: formData.get('type_contrat'),
      date_debut: formData.get('date_debut'),
      date_fin: formData.get('date_fin'),
      statut: 'actif',
    });

    setLoading(false);

    if (error) {
      setMessage('❌ Erreur : ' + error.message);
    } else {
      setMessage('✅ Contrat ajouté avec succès !');
      setTimeout(() => router.push(`/prestataires/${selectedPrestataire}`), 1500);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-8 shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Ajouter un Contrat / Marché</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Saisissez les informations du nouveau marché</p>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-3xl mx-auto">
          {message && (
            <div className={`p-4 rounded-xl mb-6 ${message.includes('✅') ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-950 shadow-sm rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
            
            {/* Prestataire */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Prestataire *</label>
              <select 
                value={selectedPrestataire} 
                onChange={(e) => setSelectedPrestataire(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">-- Choisir un prestataire --</option>
                {prestataires.map((p) => (
                  <option key={p.id} value={p.id}>{p.societe}</option>
                ))}
              </select>
            </div>

            {/* Nom du marché et N° Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Marché *</label>
                <input name="nom_marche" required placeholder="ex: 16-120" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">N° Tiers</label>
                <input name="numero_tiers" placeholder="ex: 537" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
            </div>

            {/* Budget et Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Budget *</label>
                <select name="budget" required className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                  <option value="">-- Choisir --</option>
                  <option value="Principale">Principale</option>
                  <option value="Annexe">Annexe</option>
                  <option value="Régie d'avance">Régie d'avance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Section *</label>
                <select name="section" required className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                  <option value="">-- Choisir --</option>
                  <option value="Fonctionnement">Fonctionnement</option>
                  <option value="Investissement">Investissement</option>
                </select>
              </div>
            </div>

            {/* Imputation et Montant */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Imputation (Code comptable)</label>
                <input name="imputation" placeholder="ex: 615000" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">💰 Montant du marché (€)</label>
                <input 
                  name="montant_marche" 
                  type="text"
                  inputMode="decimal"
                  placeholder="ex: 45 000,00" 
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                />
              </div>
            </div>

            {/* Interventions préventives */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                🔧 Interventions préventives prévues par an
              </label>
              <input 
                name="interventions_prevues" 
                type="number" 
                min="0"
                placeholder="ex: 4 (laisser vide ou 0 si non applicable)" 
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Nombre d'interventions préventives que le prestataire doit réaliser chaque année
              </p>
            </div>

            {/* Type de contrat */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Type de contrat</label>
              <input name="type_contrat" placeholder="ex: Accord cadre mono-attributaire" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Date de début</label>
                <input name="date_debut" type="date" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Date de fin</label>
                <input name="date_fin" type="date" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={loading || !selectedPrestataire}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white px-6 py-2.5 rounded-lg transition-colors font-medium"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Enregistrement...' : 'Enregistrer le contrat'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}