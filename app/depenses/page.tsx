'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Sidebar from '../../components/Sidebar';
import { Wallet, Plus, Filter, Edit3, Trash2, MessageCircle, X, Save } from 'lucide-react';

export default function DepensesPage() {
  const router = useRouter();
  const [depenses, setDepenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [anneeFilter, setAnneeFilter] = useState(new Date().getFullYear());
  const [typeFilter, setTypeFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // NOUVEAU : On stocke le rôle de l'utilisateur connecté
  const [userRole, setUserRole] = useState<string>('lecture'); 
  
  const [newDepense, setNewDepense] = useState({
    type_depense: 'marche',
    contrat_id: '',
    societe_libre: '',
    categorie_budget: 'Principale',
    sous_categorie: 'Fonctionnement',
    annee_imputation: new Date().getFullYear(),
    nature: '',
    designation: '',
    montant_ttc: '',
    commentaire: ''
  });
  
  const [contrats, setContrats] = useState<any[]>([]);
  
  useEffect(() => {
  const checkAuth = async () => {
    // CORRECTION ICI : on récupère la session, pas l'user directement
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    
    // On récupère le rôle de l'utilisateur connecté
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile) setUserRole(profile.role || 'lecture');

    fetchData();
    fetchContrats();
  };
  checkAuth();
}, [router, anneeFilter, typeFilter]);

  const fetchData = async () => {
    setLoading(true);
    let query = supabase.from('depenses').select(`
      *,
      contrats ( nom_marche, budget, prestataires ( societe ) )
    `).eq('annee_imputation', anneeFilter);

    if (typeFilter !== 'all') {
      query = query.eq('type_depense', typeFilter);
    }

    const { data } = await query.order('date_depense', { ascending: false });
    setDepenses(data || []);
    setLoading(false);
  };

  const fetchContrats = async () => {
    const { data } = await supabase.from('contrats').select('id, nom_marche, budget, prestataires ( societe )');
    setContrats(data || []);
  };

  const formatEuro = (montant: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(montant);

  const handleSave = async () => {
    if (!newDepense.nature || !newDepense.designation || !newDepense.montant_ttc) {
      return alert("Nature, Désignation et Montant sont obligatoires");
    }
    
    if (newDepense.type_depense === 'marche' && !newDepense.contrat_id) {
      return alert("Veuillez sélectionner un marché dans la liste.");
    }
    if (newDepense.type_depense === 'libre' && !newDepense.societe_libre) {
      return alert("Veuillez saisir le nom de la société.");
    }
    
    const montantPropre = newDepense.montant_ttc.toString().replace(/\s/g, '').replace(',', '.');
    const montant = parseFloat(montantPropre);
    
    if (isNaN(montant)) {
      return alert("Le montant doit être un nombre valide (ex: 1500 ou 1500,50)");
    }
    
    const dataToSave = {
      type_depense: newDepense.type_depense,
      contrat_id: (newDepense.type_depense === 'marche' && newDepense.contrat_id) ? newDepense.contrat_id : null,
      societe_libre: (newDepense.type_depense === 'libre' && newDepense.societe_libre) ? newDepense.societe_libre : null,
      categorie_budget: newDepense.categorie_budget, 
      sous_categorie: newDepense.sous_categorie,
      annee_imputation: newDepense.annee_imputation,
      nature: newDepense.nature,
      designation: newDepense.designation,
      montant_ttc: montant,
      commentaire: newDepense.commentaire || null,
      date_depense: new Date().toISOString().split('T')[0]
    };

    if (editingId) {
      const { error } = await supabase.from('depenses').update(dataToSave).eq('id', editingId);
      if (!error) { setIsModalOpen(false); setEditingId(null); fetchData(); }
      else { alert('Erreur : ' + error.message); }
    } else {
      const { error } = await supabase.from('depenses').insert(dataToSave);
      if (!error) { setIsModalOpen(false); fetchData(); }
      else { alert('Erreur : ' + error.message); }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer cette dépense ?')) {
      const { error } = await supabase.from('depenses').delete().eq('id', id);
      if (!error) fetchData();
      else { alert('Erreur : ' + error.message); }
    }
  };

  const openEditModal = (dep: any) => {
    setEditingId(dep.id);
    setNewDepense({
      type_depense: dep.type_depense,
      contrat_id: dep.contrat_id || '',
      societe_libre: dep.societe_libre || '',
      categorie_budget: dep.categorie_budget || 'Principale',
      sous_categorie: dep.categorie_budget === 'Régie d\'avance' ? 'N/A' : (dep.sous_categorie || 'Fonctionnement'),
      annee_imputation: dep.annee_imputation,
      nature: dep.nature,
      designation: dep.designation,
      montant_ttc: dep.montant_ttc.toString(),
      commentaire: dep.commentaire || ''
    });
    setIsModalOpen(true);
  };

  const totalMarches = depenses.filter(d => d.type_depense === 'marche').reduce((sum, d) => sum + Number(d.montant_ttc), 0);
  const totalLibre = depenses.filter(d => d.type_depense === 'libre').reduce((sum, d) => sum + Number(d.montant_ttc), 0);
  const totalGeneral = totalMarches + totalLibre;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">Chargement...</div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-8 shadow-sm sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Dépenses GESTA
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Suivi de toutes les dépenses (marchés et hors marchés)</p>
          </div>
          
          {/* NOUVEAU : On cache le bouton "Ajouter" si l'utilisateur est en lecture seule */}
          {userRole !== 'lecture' && (
            <button onClick={() => { 
              setEditingId(null); 
              setNewDepense({ type_depense: 'marche', contrat_id: '', societe_libre: '', categorie_budget: 'Principale', sous_categorie: 'Fonctionnement', annee_imputation: anneeFilter, nature: '', designation: '', montant_ttc: '', commentaire: '' }); 
              setIsModalOpen(true); 
            }} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
              <Plus className="h-4 w-4" /> Ajouter une dépense
            </button>
          )}
        </header>

        <div className="p-8">
          {/* Filtres */}
          <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-6 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Filtres :</span>
            </div>
            <select value={anneeFilter} onChange={(e) => setAnneeFilter(parseInt(e.target.value))} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-sm">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-sm">
              <option value="all">Tous les types</option>
              <option value="marche">Liées à un marché</option>
              <option value="libre">Hors marché</option>
            </select>
          </div>

          {/* Totaux */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Liées à marchés</p>
              <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-200">{formatEuro(totalMarches)}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
              <p className="text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">Hors marchés</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-200">{formatEuro(totalLibre)}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">TOTAL {anneeFilter}</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">{formatEuro(totalGeneral)}</p>
            </div>
          </div>

          {/* Tableau */}
          <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            {depenses.length === 0 ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500">Aucune dépense trouvée pour {anneeFilter}.</div>
            ) : (
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Budget</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Section</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Nature</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Désignation</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Montant TTC</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">💬</th>
                    {/* NOUVEAU : On cache la colonne Actions si lecture seule */}
                    {userRole !== 'lecture' && (
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {depenses.map((dep) => (
                    <tr key={dep.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors relative">
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">{new Date(dep.date_depense).toLocaleDateString('fr-FR')}</td>
                      
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <span className={`inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                            dep.type_depense === 'marche' 
                              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                              : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                          }`}>
                            {dep.type_depense === 'marche' ? '📄 Marché' : '🆓 Libre'}
                          </span>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px]" title={dep.type_depense === 'marche' ? dep.contrats?.prestataires?.societe : dep.societe_libre}>
                            {dep.type_depense === 'marche' ? (dep.contrats?.prestataires?.societe || 'N/A') : (dep.societe_libre || 'N/A')}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-100 dark:border-blue-800">
                          {dep.categorie_budget || '-'}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-100 dark:border-purple-800">
                          {dep.sous_categorie || '-'}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{dep.nature}</td>
                      <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200 max-w-xs truncate" title={dep.designation}>{dep.designation}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap">{formatEuro(dep.montant_ttc)}</td>
                      
                      <td className="px-4 py-3 text-center">
                        <button 
                          title={dep.commentaire || "Aucun commentaire"}
                          className={`relative p-1.5 rounded-lg transition-colors cursor-help ${dep.commentaire ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-slate-300 dark:text-slate-600'}`}
                        >
                          <MessageCircle className="w-4 h-4" />
                          {dep.commentaire && (
                            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white dark:border-slate-950"></span>
                          )}
                        </button>
                      </td>
                      
                      {/* NOUVEAU : On cache les boutons Modifier/Supprimer si lecture seule */}
                      {userRole !== 'lecture' && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEditModal(dep)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(dep.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* MODALE AJOUT/MODIFICATION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900 sticky top-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{editingId ? 'Modifier la dépense' : 'Ajouter une dépense'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Type de dépense</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="type" value="marche" checked={newDepense.type_depense === 'marche'} onChange={(e) => setNewDepense({...newDepense, type_depense: e.target.value})} className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">📄 Liée à un marché</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="type" value="libre" checked={newDepense.type_depense === 'libre'} onChange={(e) => setNewDepense({...newDepense, type_depense: e.target.value})} className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">🆓 Hors marché</span>
                  </label>
                </div>
              </div>

              {newDepense.type_depense === 'marche' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Marché concerné *</label>
                  <select value={newDepense.contrat_id} onChange={(e) => setNewDepense({...newDepense, contrat_id: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    <option value="">-- Choisir un marché --</option>
                    {contrats.map(c => <option key={c.id} value={c.id}>{c.nom_marche} - {c.prestataires?.societe}</option>)}
                  </select>
                </div>
              )}

              {newDepense.type_depense === 'libre' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Société *</label>
                  <input value={newDepense.societe_libre} onChange={(e) => setNewDepense({...newDepense, societe_libre: e.target.value})} placeholder="Nom de la société" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Catégorie Budget *</label>
                  <select 
                    value={newDepense.categorie_budget} 
                    onChange={(e) => {
                      const newBudget = e.target.value;
                      setNewDepense({
                        ...newDepense, 
                        categorie_budget: newBudget,
                        sous_categorie: newBudget === 'Régie d\'avance' ? 'N/A' : 'Fonctionnement'
                      });
                    }} 
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="Principale">Principale</option>
                    <option value="Annexe">Annexe</option>
                    <option value="Régie d'avance">Régie d'avance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Sous-catégorie *</label>
                  {newDepense.categorie_budget === 'Régie d\'avance' ? (
                    <input 
                      type="text" 
                      value="N/A" 
                      disabled 
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed font-medium"
                    />
                  ) : (
                    <select 
                      value={newDepense.sous_categorie} 
                      onChange={(e) => setNewDepense({...newDepense, sous_categorie: e.target.value})} 
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="Fonctionnement">Fonctionnement</option>
                      <option value="Investissement">Investissement</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Année d'imputation</label>
                  <input type="number" value={newDepense.annee_imputation} onChange={(e) => setNewDepense({...newDepense, annee_imputation: parseInt(e.target.value)})} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nature (Code) *</label>
                  <input value={newDepense.nature} onChange={(e) => setNewDepense({...newDepense, nature: e.target.value})} placeholder="ex: 615000" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Désignation *</label>
                <input value={newDepense.designation} onChange={(e) => setNewDepense({...newDepense, designation: e.target.value})} placeholder="Description de la dépense" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Montant TTC (€) *</label>
                <input 
                  type="text" 
                  inputMode="decimal" 
                  value={newDepense.montant_ttc} 
                  onChange={(e) => setNewDepense({...newDepense, montant_ttc: e.target.value})} 
                  placeholder="ex: 1500,50" 
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Commentaire (optionnel)</label>
                <textarea value={newDepense.commentaire} onChange={(e) => setNewDepense({...newDepense, commentaire: e.target.value})} rows={2} placeholder="ex: Facture n°1234" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 sticky bottom-0">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800">Annuler</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"><Save className="h-4 w-4" /> {editingId ? 'Mettre à jour' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}