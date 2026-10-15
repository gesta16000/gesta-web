'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Sidebar from '../../components/Sidebar';
import { Wallet, Plus, Edit3, Trash2, MessageCircle, X, Save, Search } from 'lucide-react';

export default function DepensesPage() {
  const router = useRouter();
  const [depenses, setDepenses] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [anneeFilter, setAnneeFilter] = useState(new Date().getFullYear());
  const [typeFilter, setTypeFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('lecture'); 
  
  // NOUVEAU : Gestion des onglets
  const [activeTab, setActiveTab] = useState<'budgetaires' | 'regie'>('budgetaires');
  
  const [searchBudget, setSearchBudget] = useState('');
  const [searchRegie, setSearchRegie] = useState('');

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (profile) setUserRole(profile.role || 'lecture');

      fetchData();
      fetchContrats();
      fetchBudgets();
    };
    checkAuth();
  }, [router, anneeFilter, typeFilter]);

  const fetchBudgets = async () => {
    const { data } = await supabase.from('budgets_votes').select('*').eq('annee', anneeFilter);
    setBudgets(data || []);
  };

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

  const depensesBudgetaires = depenses.filter(d => d.categorie_budget === 'Principale' || d.categorie_budget === 'Annexe');
  const depensesRegie = depenses.filter(d => d.categorie_budget === 'Régie d\'avance');

  const budgetPrincipal = budgets.filter(b => b.type_budget === 'Principale').reduce((sum, b) => sum + (b.montant_ttc || 0), 0);
  const budgetAnnexe = budgets.filter(b => b.type_budget === 'Annexe').reduce((sum, b) => sum + (b.montant_ttc || 0), 0);
  const totalBudgetVoté = budgetPrincipal + budgetAnnexe;

  const engagePrincipal = depensesBudgetaires.filter(d => d.categorie_budget === 'Principale').reduce((sum, d) => sum + Number(d.montant_ttc), 0);
  const engageAnnexe = depensesBudgetaires.filter(d => d.categorie_budget === 'Annexe').reduce((sum, d) => sum + Number(d.montant_ttc), 0);
  const totalEngage = engagePrincipal + engageAnnexe;
  const totalRegie = depensesRegie.reduce((sum, d) => sum + Number(d.montant_ttc), 0);

  const filteredBudgetaires = depensesBudgetaires.filter(d => {
    const matchSearch = searchBudget === '' || 
      d.designation?.toLowerCase().includes(searchBudget.toLowerCase()) ||
      d.nature?.toLowerCase().includes(searchBudget.toLowerCase());
    const matchType = typeFilter === 'all' || d.type_depense === typeFilter;
    return matchSearch && matchType;
  });

  const filteredRegie = depensesRegie.filter(d => {
    return searchRegie === '' || 
      d.designation?.toLowerCase().includes(searchRegie.toLowerCase()) ||
      d.nature?.toLowerCase().includes(searchRegie.toLowerCase());
  });

  const handleSave = async () => {
    if (!newDepense.nature || !newDepense.designation || !newDepense.montant_ttc) {
      return alert("Nature, Désignation et Montant sont obligatoires");
    }
    if (newDepense.type_depense === 'marche' && !newDepense.contrat_id) return alert("Veuillez sélectionner un marché.");
    if (newDepense.type_depense === 'libre' && !newDepense.societe_libre) return alert("Veuillez saisir le nom de la société.");
    
    const montantPropre = newDepense.montant_ttc.toString().replace(/\s/g, '').replace(',', '.');
    const montant = parseFloat(montantPropre);
    if (isNaN(montant)) return alert("Le montant doit être un nombre valide");
    
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

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">Chargement...</div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 transition-colors">
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
          
          {userRole !== 'lecture' && (
            <button onClick={() => { 
              setEditingId(null); 
              setNewDepense({ type_depense: 'marche', contrat_id: '', societe_libre: '', categorie_budget: 'Principale', sous_categorie: 'Fonctionnement', annee_imputation: anneeFilter, nature: '', designation: '', montant_ttc: '', commentaire: '' }); 
              setIsModalOpen(true); 
            }} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-md">
              <Plus className="h-4 w-4" /> Ajouter une dépense
            </button>
          )}
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {/* 1. KPI GLOBAL */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">💰 Budget Voté {anneeFilter}</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-indigo-100 uppercase tracking-wide">Total Budget</p>
                <p className="text-2xl font-black">{formatEuro(totalBudgetVoté)}</p>
              </div>
              <div>
                <p className="text-xs text-indigo-100 uppercase tracking-wide">Total Engagé</p>
                <p className="text-2xl font-black">{formatEuro(totalEngage)}</p>
              </div>
              <div>
                <p className="text-xs text-indigo-100 uppercase tracking-wide">Reste Disponible</p>
                <p className="text-2xl font-black">{formatEuro(totalBudgetVoté - totalEngage)}</p>
              </div>
              <div>
                <p className="text-xs text-indigo-100 uppercase tracking-wide">Taux d'Engagement</p>
                <p className="text-2xl font-black">{totalBudgetVoté > 0 ? ((totalEngage / totalBudgetVoté) * 100).toFixed(1) : 0}%</p>
              </div>
            </div>
            <div className="mt-4 bg-white/20 rounded-full h-2 overflow-hidden">
  <div 
    className={`h-full transition-all duration-500 ${
      totalBudgetVoté > 0 && (totalEngage / totalBudgetVoté) > 1 
        ? 'bg-red-500' 
        : 'bg-white'
    }`} 
    style={{ width: `${totalBudgetVoté > 0 ? Math.min((totalEngage / totalBudgetVoté) * 100, 100) : 0}%` }} 
  />
</div>
          </div>

          {/* 2. KPIs PAR RÉGIE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl shadow-md border-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30"><Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
                <h3 className="font-bold text-slate-900 dark:text-white">Principale</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-xs text-slate-500">Budget voté</span><span className="font-bold text-slate-900 dark:text-white">{formatEuro(budgetPrincipal)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-slate-500">Engagé</span><span className="font-bold text-blue-600 dark:text-blue-400">{formatEuro(engagePrincipal)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-slate-500">Reste</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{formatEuro(budgetPrincipal - engagePrincipal)}</span></div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl shadow-md border-2 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30"><Wallet className="w-5 h-5 text-green-600 dark:text-green-400" /></div>
                <h3 className="font-bold text-slate-900 dark:text-white">Annexe</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-xs text-slate-500">Budget voté</span><span className="font-bold text-slate-900 dark:text-white">{formatEuro(budgetAnnexe)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-slate-500">Engagé</span><span className="font-bold text-green-600 dark:text-green-400">{formatEuro(engageAnnexe)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-slate-500">Reste</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{formatEuro(budgetAnnexe - engageAnnexe)}</span></div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl shadow-md border-2 border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30"><Wallet className="w-5 h-5 text-orange-600 dark:text-orange-400" /></div>
                <h3 className="font-bold text-slate-900 dark:text-white">Régie d'avance</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-xs text-slate-500">Total dépenses</span><span className="font-bold text-slate-900 dark:text-white">{formatEuro(totalRegie)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-slate-500">Nombre de lignes</span><span className="font-bold text-orange-600 dark:text-orange-400">{depensesRegie.length}</span></div>
                <p className="text-xs text-slate-400 mt-2 italic">N'impacte pas le budget voté</p>
              </div>
            </div>
          </div>

          {/* 3. SYSTÈME D'ONGLETS */}
          <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            
            {/* Barre d'onglets */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <button
                onClick={() => setActiveTab('budgetaires')}
                className={`flex-1 px-6 py-4 text-sm font-bold transition-all border-b-2 ${
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
                className={`flex-1 px-6 py-4 text-sm font-bold transition-all border-b-2 ${
                  activeTab === 'regie'
                    ? 'border-orange-600 text-orange-700 dark:text-orange-400 bg-white dark:bg-slate-950'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span> Régie d'avance</span>
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

            {/* Contenu des onglets */}
            <div className="p-6">
              
              {/* ONGLET 1 : DÉPENSES BUDGÉTAIRES */}
              {activeTab === 'budgetaires' && (
                <div>
                  <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Dépenses budgétaires</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Ces dépenses impactent le budget voté (Principal & Annexe)</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Rechercher..." value={searchBudget} onChange={(e) => setSearchBudget(e.target.value)} className="w-full md:w-64 pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                      </div>
                      <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-sm">
                        <option value="all">Tous les types</option>
                        <option value="marche">Liées à un marché</option>
                        <option value="libre">Hors marché</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                      <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Budget</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Section</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Nature</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Désignation</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Montant TTC</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">💬</th>
                          {userRole !== 'lecture' && <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950">
                        {filteredBudgetaires.length === 0 ? (
                          <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">Aucune dépense trouvée.</td></tr>
                        ) : (
                          filteredBudgetaires.map((dep) => (
                            <tr key={dep.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">{new Date(dep.date_depense).toLocaleDateString('fr-FR')}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${dep.type_depense === 'marche' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'}`}>
                                  {dep.type_depense === 'marche' ? '📄 Marché' : '🆓 Libre'}
                                </span>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px] mt-1" title={dep.type_depense === 'marche' ? dep.contrats?.prestataires?.societe : dep.societe_libre}>
                                  {dep.type_depense === 'marche' ? (dep.contrats?.prestataires?.societe || 'N/A') : (dep.societe_libre || 'N/A')}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${dep.categorie_budget === 'Principale' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-100 dark:border-green-800'}`}>
                                  {dep.categorie_budget}
                                </span>
                              </td>
                              <td className="px-4 py-3"><span className="inline-flex items-center px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-100 dark:border-purple-800">{dep.sous_categorie || '-'}</span></td>
                              <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{dep.nature}</td>
                              <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200 max-w-xs truncate" title={dep.designation}>{dep.designation}</td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap">{formatEuro(dep.montant_ttc)}</td>
                              <td className="px-4 py-3 text-center">
                                <button title={dep.commentaire || "Aucun commentaire"} className={`relative p-1.5 rounded-lg transition-colors cursor-help ${dep.commentaire ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-slate-300 dark:text-slate-600'}`}>
                                  <MessageCircle className="w-4 h-4" />
                                  {dep.commentaire && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white dark:border-slate-950"></span>}
                                </button>
                              </td>
                              {userRole !== 'lecture' && (
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button onClick={() => openEditModal(dep)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"><Edit3 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(dep.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot className="bg-indigo-50 dark:bg-slate-900 border-t-2 border-indigo-200 dark:border-indigo-800">
                        <tr>
                          <td colSpan={6} className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 text-right">Total :</td>
                          <td className="px-4 py-3 text-right font-black text-lg text-indigo-700 dark:text-indigo-300">{formatEuro(filteredBudgetaires.reduce((sum, d) => sum + Number(d.montant_ttc), 0))}</td>
                          <td></td><td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* ONGLET 2 : RÉGIE D'AVANCE */}
              {activeTab === 'regie' && (
                <div>
                  <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">🟠 Régie d'avance</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Ces dépenses n'impactent pas le budget voté</p>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" placeholder="Rechercher dans la régie d'avance..." value={searchRegie} onChange={(e) => setSearchRegie(e.target.value)} className="w-full md:w-64 pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                      <thead className="bg-orange-50 dark:bg-slate-900 border-b border-orange-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Nature</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Désignation</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Montant TTC</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">💬</th>
                          {userRole !== 'lecture' && <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950">
                        {filteredRegie.length === 0 ? (
                          <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Aucune dépense de régie d'avance.</td></tr>
                        ) : (
                          filteredRegie.map((dep) => (
                            <tr key={dep.id} className="hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors">
                              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">{new Date(dep.date_depense).toLocaleDateString('fr-FR')}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                                  {dep.type_depense === 'marche' ? '📄 Marché' : '🆓 Libre'}
                                </span>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px] mt-1">{dep.societe_libre || 'N/A'}</p>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{dep.nature}</td>
                              <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200 max-w-xs truncate" title={dep.designation}>{dep.designation}</td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap">{formatEuro(dep.montant_ttc)}</td>
                              <td className="px-4 py-3 text-center">
                                <button title={dep.commentaire || "Aucun commentaire"} className={`relative p-1.5 rounded-lg transition-colors cursor-help ${dep.commentaire ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-slate-300 dark:text-slate-600'}`}>
                                  <MessageCircle className="w-4 h-4" />
                                  {dep.commentaire && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white dark:border-slate-950"></span>}
                                </button>
                              </td>
                              {userRole !== 'lecture' && (
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button onClick={() => openEditModal(dep)} className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"><Edit3 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(dep.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot className="bg-orange-50 dark:bg-orange-900/10 border-t-2 border-orange-200 dark:border-orange-800">
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 text-right">Total Régie d'avance :</td>
                          <td className="px-4 py-3 text-right font-black text-lg text-orange-600 dark:text-orange-400">{formatEuro(filteredRegie.reduce((sum, d) => sum + Number(d.montant_ttc), 0))}</td>
                          <td></td><td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

            </div>
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
                  <select value={newDepense.categorie_budget} onChange={(e) => {
                    const newBudget = e.target.value;
                    setNewDepense({...newDepense, categorie_budget: newBudget, sous_categorie: newBudget === 'Régie d\'avance' ? 'N/A' : 'Fonctionnement'});
                  }} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    <option value="Principale">Principale</option>
                    <option value="Annexe">Annexe</option>
                    <option value="Régie d'avance">Régie d'avance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Sous-catégorie *</label>
                  {newDepense.categorie_budget === 'Régie d\'avance' ? (
                    <input type="text" value="N/A" disabled className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed font-medium" />
                  ) : (
                    <select value={newDepense.sous_categorie} onChange={(e) => setNewDepense({...newDepense, sous_categorie: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
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
                <input type="text" inputMode="decimal" value={newDepense.montant_ttc} onChange={(e) => setNewDepense({...newDepense, montant_ttc: e.target.value})} placeholder="ex: 1500,50" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
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