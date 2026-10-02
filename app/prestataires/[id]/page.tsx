'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Sidebar from '../../../components/Sidebar';
import { 
  ArrowLeft, Plus, X, Loader2, Building2, Phone, Mail, MapPin, 
  UserPlus, Calendar, Paperclip, Download, Trash2, Edit3, CheckCircle2, Briefcase, 
  FileText, Hash, Clock, FolderOpen, Eye, Printer, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PrestataireDetailPage() {
  const router = useRouter();
  const params = useParams();
  const prestataireId = params.id as string;

  const [prestataire, setPrestataire] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [marches, setMarches] = useState<any[]>([]);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeModal, setActiveModal] = useState<'contact' | 'marche' | 'intervention' | 'prestataire' | null>(null);
  const [editingMarche, setEditingMarche] = useState<any>(null);
  const [editingIntervention, setEditingIntervention] = useState<any>(null);
  const [editingContact, setEditingContact] = useState<any>(null);
  
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string; type: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  const [newContact, setNewContact] = useState({ nom: '', email: '', telephone: '', fonction: '' });
  const [prestataireForm, setPrestataireForm] = useState({ societe: '', siret: '', adresse: '', telephone: '', email: '', contact_nom: '' });
  
  const [marcheForm, setMarcheForm] = useState({
    numero_tiers: '', numero_marche: '', objet: '', budget: 'Principale', section: 'Fonctionnement',
    imputation: '', type_contrat: 'Accord cadre avec un seul opérateur mono attributaire',
    montant_ht: '', montant_ttc: '', date_notification: '', date_debut: '', date_fin: '', nb_interventions_an: ''
  });
  const [marcheFiles, setMarcheFiles] = useState({ cctp: null as File | null, ccap: null as File | null, bpu: null as File | null, ae: null as File | null, documents_supp: null as File | null });

  const [interventionForm, setInterventionForm] = useState({ contrat_id: '', numero_dossier: '', intervenant: '', date_debut: new Date().toISOString().split('T')[0], date_fin: '', description: '', montant: '' });
  const [interventionFile, setInterventionFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchData(); }, [prestataireId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: pData } = await supabase.from('prestataires').select('*').eq('id', prestataireId).single();
      setPrestataire(pData);
      const { data: cData } = await supabase.from('contacts').select('*').eq('prestataire_id', prestataireId).order('created_at', { ascending: false });
      setContacts(cData || []);
      const { data: mData } = await supabase.from('contrats').select('*').eq('prestataire_id', prestataireId).order('date_fin', { ascending: true });
      setMarches(mData || []);
      const marcheIds = (mData || []).map((m: any) => m.id);
      let iData: any[] = [];
      if (marcheIds.length > 0) {
        const { data } = await supabase.from('interventions').select(`*, contrats ( numero_marche, objet, nom_marche )`).in('contrat_id', marcheIds).order('date_debut', { ascending: false });
        iData = data || [];
      }
      setInterventions(iData);
    } catch (error) { console.error("Erreur fetch:", error); } 
    finally { setLoading(false); }
  };

  const openPreview = async (path: string, name: string, type: string, bucket: string = 'marches-documents') => {
    setPreviewLoading(true);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
    setPreviewLoading(false);
    if (error) { alert('Erreur : ' + error.message); return; }
    setPreviewDoc({ url: data.signedUrl, name, type });
  };

  const handleDownload = () => { if (previewDoc) { const link = document.createElement('a'); link.href = previewDoc.url; link.download = previewDoc.name; link.click(); } };
  const handlePrint = () => { if (previewDoc) { const printWindow = window.open(previewDoc.url, '_blank'); if (printWindow) { printWindow.onload = () => printWindow.print(); } } };
  const handleOpenNewTab = () => { if (previewDoc) { window.open(previewDoc.url, '_blank'); } };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('contacts').insert({ prestataire_id: prestataireId, ...newContact });
    if (!error) { setNewContact({ nom: '', email: '', telephone: '', fonction: '' }); setActiveModal(null); fetchData(); } 
    else { alert('Erreur: ' + error.message); }
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    setUploading(true);
    try {
      const { error } = await supabase.from('contacts').update(newContact).eq('id', editingContact.id);
      if (error) throw error;
      setEditingContact(null); setNewContact({ nom: '', email: '', telephone: '', fonction: '' }); setActiveModal(null); fetchData();
    } catch (error: any) { alert('Erreur : ' + error.message); } 
    finally { setUploading(false); }
  };

  const handleDeleteContact = async (id: string) => {
    if(confirm('Supprimer ce contact ?')) { await supabase.from('contacts').delete().eq('id', id); fetchData(); }
  };

  const openEditContact = (contact: any) => {
    setEditingContact(contact);
    setNewContact({ nom: contact.nom, email: contact.email, telephone: contact.telephone, fonction: contact.fonction });
    setActiveModal('contact');
  };

  const openEditPrestataire = () => {
    setPrestataireForm({
      societe: prestataire.societe || '', siret: prestataire.siret || '', adresse: prestataire.adresse || '',
      telephone: prestataire.telephone || '', email: prestataire.email || '', contact_nom: prestataire.contact_nom || ''
    });
    setActiveModal('prestataire');
  };

  const handleUpdatePrestataire = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      const { error } = await supabase.from('prestataires').update(prestataireForm).eq('id', prestataireId);
      if (error) throw error;
      setPrestataire({ ...prestataire, ...prestataireForm });
      setActiveModal(null);
    } catch (error: any) { alert('Erreur : ' + error.message); } 
    finally { setUploading(false); }
  };

  const handleDeletePrestataire = async () => {
    if (!confirm("⚠️ Êtes-vous sûr de vouloir supprimer ce prestataire ?\n\nCette action est irréversible et supprimera également ses contacts, marchés et interventions associés.")) {
      return;
    }
    setUploading(true);
    try {
      const { error } = await supabase.from('prestataires').delete().eq('id', prestataireId);
      if (error) throw error;
      router.push('/prestataires');
    } catch (error: any) {
      alert('Erreur lors de la suppression : ' + error.message);
      setUploading(false);
    }
  };

  const handleSaveMarche = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let marcheData: any = {
        prestataire_id: prestataireId, numero_tiers: marcheForm.numero_tiers, numero_marche: marcheForm.numero_marche,
        nom_marche: marcheForm.objet, objet: marcheForm.objet, budget: marcheForm.budget, section: marcheForm.section,
        imputation: marcheForm.imputation, type_contrat: marcheForm.type_contrat,
        montant_ht: parseFloat(marcheForm.montant_ht) || 0, montant_ttc: parseFloat(marcheForm.montant_ttc) || 0,
        date_notification: marcheForm.date_notification, date_debut: marcheForm.date_debut, date_fin: marcheForm.date_fin,
        nb_interventions_an: parseInt(marcheForm.nb_interventions_an) || null,
      };
      let marcheId = editingMarche?.id;
      if (editingMarche) {
        const { error } = await supabase.from('contrats').update(marcheData).eq('id', editingMarche.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('contrats').insert(marcheData).select().single();
        if (error) throw error;
        marcheId = data.id;
      }
      const uploadFile = async (file: File, type: string) => {
        const ext = file.name.split('.').pop();
        const path = `marche_${marcheId}_${type}.${ext}`;
        const { error } = await supabase.storage.from('marches-documents').upload(path, file, { upsert: true });
        if (error) throw error;
        await supabase.from('contrats').update({ [`${type}_path`]: path }).eq('id', marcheId);
      };
      if (marcheFiles.cctp) await uploadFile(marcheFiles.cctp, 'cctp');
      if (marcheFiles.ccap) await uploadFile(marcheFiles.ccap, 'ccap');
      if (marcheFiles.bpu) await uploadFile(marcheFiles.bpu, 'bpu');
      if (marcheFiles.ae) await uploadFile(marcheFiles.ae, 'ae');
      if (marcheFiles.documents_supp) await uploadFile(marcheFiles.documents_supp, 'documents_supp');

      setMarcheForm({ numero_tiers: '', numero_marche: '', objet: '', budget: 'Principale', section: 'Fonctionnement', imputation: '', type_contrat: 'Accord cadre avec un seul opérateur mono attributaire', montant_ht: '', montant_ttc: '', date_notification: '', date_debut: '', date_fin: '', nb_interventions_an: '' });
      setMarcheFiles({ cctp: null, ccap: null, bpu: null, ae: null, documents_supp: null });
      setEditingMarche(null); setActiveModal(null); fetchData();
    } catch (error: any) { alert('Erreur : ' + error.message); } 
    finally { setUploading(false); }
  };

  const handleDeleteMarche = async (id: string) => {
    if(confirm('Supprimer ce marché et toutes ses interventions ?')) { 
      await supabase.from('interventions').delete().eq('contrat_id', id);
      await supabase.from('contrats').delete().eq('id', id); 
      fetchData(); 
    }
  };

  const openEditMarche = (marche: any) => {
    setEditingMarche(marche);
    setMarcheForm({
      numero_tiers: marche.numero_tiers || '', numero_marche: marche.numero_marche || '', objet: marche.nom_marche || marche.objet || '',
      budget: marche.budget || 'Principale', section: marche.section || 'Fonctionnement', imputation: marche.imputation || '',
      type_contrat: marche.type_contrat || 'Accord cadre avec un seul opérateur mono attributaire',
      montant_ht: marche.montant_ht?.toString() || '', montant_ttc: marche.montant_ttc?.toString() || '',
      date_notification: marche.date_notification || '', date_debut: marche.date_debut || '', date_fin: marche.date_fin || '',
      nb_interventions_an: marche.nb_interventions_an?.toString() || ''
    });
    setActiveModal('marche');
  };

  const handleSaveIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let intData: any = {
        contrat_id: interventionForm.contrat_id, numero_dossier: interventionForm.numero_dossier, intervenant: interventionForm.intervenant,
        date_debut: interventionForm.date_debut, date_fin: interventionForm.date_fin || interventionForm.date_debut,
        description: interventionForm.description, montant: parseFloat(interventionForm.montant) || 0,
      };
      let intId = editingIntervention?.id;
      if (editingIntervention) {
        const { error } = await supabase.from('interventions').update(intData).eq('id', editingIntervention.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('interventions').insert(intData).select().single();
        if (error) throw error;
        intId = data.id;
      }
      if (interventionFile) {
        const fileExt = interventionFile.name.split('.').pop();
        const filePath = `rapport_${intId}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('intervention-reports').upload(filePath, interventionFile, { upsert: true });
        if (uploadError) throw uploadError;
        await supabase.from('interventions').update({ rapport_path: filePath }).eq('id', intId);
      }
      setInterventionForm({ contrat_id: '', numero_dossier: '', intervenant: '', date_debut: new Date().toISOString().split('T')[0], date_fin: '', description: '', montant: '' });
      setInterventionFile(null); setEditingIntervention(null); setActiveModal(null); fetchData();
    } catch (error: any) { alert('Erreur : ' + error.message); } 
    finally { setUploading(false); }
  };

  const openEditIntervention = (int: any) => {
    setEditingIntervention(int);
    setInterventionForm({
      contrat_id: int.contrat_id || '', numero_dossier: int.numero_dossier || '', intervenant: int.intervenant || '',
      date_debut: int.date_debut || new Date().toISOString().split('T')[0], date_fin: int.date_fin || '',
      description: int.description || '', montant: int.montant?.toString() || ''
    });
    setActiveModal('intervention');
  };

  const handleDeleteIntervention = async (id: string) => {
    if(confirm('Supprimer cette intervention ?')) { 
      const { error } = await supabase.from('interventions').delete().eq('id', id);
      if (error) {
        alert('Erreur lors de la suppression : ' + error.message);
      } else {
        fetchData();
      }
    }
  };

  const getMarcheStatus = (dateFin: string) => {
    if (!dateFin) return { label: 'Inconnu', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
    const isExpired = new Date(dateFin) < new Date();
    return isExpired ? { label: 'Expiré', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' } : { label: 'Actif', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  if (!prestataire) return <div className="flex h-screen items-center justify-center">Prestataire introuvable</div>;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
          <div className="px-8 py-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all"><ArrowLeft className="h-5 w-5" /></button>
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {prestataire.societe?.charAt(0) || 'P'}
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">{prestataire.societe}</h1>
                <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                  <Building2 className="w-4 h-4" /> {prestataire.siret || 'SIRET inconnu'}
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <MapPin className="w-4 h-4" /> {prestataire.adresse || 'Adresse inconnue'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleDeletePrestataire} 
                disabled={uploading}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 transition-all border border-rose-200 dark:border-rose-800 font-semibold text-base disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
              <button 
                onClick={openEditPrestataire} 
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-lg shadow-indigo-500/20 font-semibold text-base"
              >
                <Edit3 className="w-4 h-4" /> Modifier la fiche
              </button>
            </div>

          </div>
        </div>

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* CONTACTS */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <span className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"><UserPlus className="w-5 h-5" /></span>
                Contacts ({contacts.length})
              </h2>
              <button onClick={() => { setActiveModal('contact'); setEditingContact(null); setNewContact({ nom: '', email: '', telephone: '', fonction: '' }); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl text-base font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95">
                <Plus className="w-5 h-5" /> Nouveau contact
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {contacts.length === 0 ? <div className="col-span-full bg-white dark:bg-slate-950 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">Aucun contact.</div> : contacts.map((c) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.03, y: -5 }} transition={{ duration: 0.3 }} className="group relative bg-white dark:bg-slate-950 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300">
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button onClick={() => openEditContact(c)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors" title="Modifier"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteContact(c.id)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                      {c.nom?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 dark:text-white text-lg leading-tight">{c.nom}</p>
                      <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mt-1">{c.fonction || 'Fonction non renseignée'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {c.email && (<a href={`mailto:${c.email}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group/link"><div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover/link:scale-110 transition-transform"><Mail className="w-4 h-4" /></div><span className="text-base font-medium text-slate-700 dark:text-slate-300 truncate">{c.email}</span></a>)}
                    {c.telephone && (<a href={`tel:${c.telephone}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors group/link"><div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover/link:scale-110 transition-transform"><Phone className="w-4 h-4" /></div><span className="text-base font-medium text-slate-700 dark:text-slate-300">{c.telephone}</span></a>)}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* MARCHÉS */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <span className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"><Briefcase className="w-5 h-5" /></span>
                Marchés & Contrats ({marches.length})
              </h2>
              <button onClick={() => { setEditingMarche(null); setMarcheForm({ numero_tiers: '', numero_marche: '', objet: '', budget: 'Principale', section: 'Fonctionnement', imputation: '', type_contrat: 'Accord cadre avec un seul opérateur mono attributaire', montant_ht: '', montant_ttc: '', date_notification: '', date_debut: '', date_fin: '', nb_interventions_an: '' }); setMarcheFiles({ cctp: null, ccap: null, bpu: null, ae: null, documents_supp: null }); setActiveModal('marche'); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl text-base font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95">
                <Plus className="w-5 h-5" /> Nouveau marché
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {marches.length === 0 ? <div className="col-span-full bg-white dark:bg-slate-950 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">Aucun marché.</div> : marches.map((m) => {
                const status = getMarcheStatus(m.date_fin);
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-950 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-xl transition-all duration-300">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center"><FileText className="w-5 h-5 text-white" /></div>
                        <div><p className="text-white font-bold text-base">{m.numero_marche || 'N/A'}</p><p className="text-indigo-100 text-sm">Tiers: {m.numero_tiers || '-'}</p></div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${status.color}`}>{status.label}</span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-black text-slate-900 dark:text-white text-lg mb-4 line-clamp-2">{m.nom_marche || m.objet || 'Sans objet'}</h3>
                      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl"><p className="text-slate-500 text-xs uppercase font-bold mb-1">Budget</p><p className="font-bold text-slate-900 dark:text-slate-100 text-base">{m.budget || '-'}</p></div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl"><p className="text-slate-500 text-xs uppercase font-bold mb-1">Section</p><p className="font-bold text-slate-900 dark:text-slate-100 text-base">{m.section || '-'}</p></div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl"><p className="text-slate-500 text-xs uppercase font-bold mb-1">Imputation</p><p className="font-bold text-slate-900 dark:text-slate-100 text-base">{m.imputation || '-'}</p></div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl"><p className="text-slate-500 text-xs uppercase font-bold mb-1">Interv./an</p><p className="font-bold text-slate-900 dark:text-slate-100 text-base">{m.nb_interventions_an ? `${m.nb_interventions_an} prevues` : 'Non défini'}</p></div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium text-base">{m.date_debut ? new Date(m.date_debut).toLocaleDateString('fr-FR') : '-'} → {m.date_fin ? new Date(m.date_fin).toLocaleDateString('fr-FR') : '-'}</span>
                      </div>

                      {(m.cctp_path || m.ccap_path || m.bpu_path || m.ae_path || m.documents_supp_path) && (
                        <div className="mb-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-xs uppercase font-bold text-slate-500 mb-3 flex items-center gap-1"><Paperclip className="w-4 h-4" /> Documents associés</p>
                          <div className="space-y-2">
                            {m.cctp_path && (<div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20"><FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" /><div className="flex-1 min-w-0"><p className="text-sm font-bold text-blue-700 dark:text-blue-300">CCTP</p><p className="text-xs text-slate-500 dark:text-slate-400 truncate">{m.cctp_path.split('_').pop()}</p></div><button onClick={() => openPreview(m.cctp_path, 'CCTP', 'cctp')} className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors" title="Voir"><Eye className="w-4 h-4" /></button></div>)}
                            {m.ccap_path && (<div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20"><FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" /><div className="flex-1 min-w-0"><p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">CCAP</p><p className="text-xs text-slate-500 dark:text-slate-400 truncate">{m.ccap_path.split('_').pop()}</p></div><button onClick={() => openPreview(m.ccap_path, 'CCAP', 'ccap')} className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" title="Voir"><Eye className="w-4 h-4" /></button></div>)}
                            {m.bpu_path && (<div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20"><FileText className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" /><div className="flex-1 min-w-0"><p className="text-sm font-bold text-amber-700 dark:text-amber-300">BPU</p><p className="text-xs text-slate-500 dark:text-slate-400 truncate">{m.bpu_path.split('_').pop()}</p></div><button onClick={() => openPreview(m.bpu_path, 'BPU', 'bpu')} className="p-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors" title="Voir"><Eye className="w-4 h-4" /></button></div>)}
                            {m.ae_path && (<div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20"><FileText className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" /><div className="flex-1 min-w-0"><p className="text-sm font-bold text-purple-700 dark:text-purple-300">AE</p><p className="text-xs text-slate-500 dark:text-slate-400 truncate">{m.ae_path.split('_').pop()}</p></div><button onClick={() => openPreview(m.ae_path, 'AE', 'ae')} className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors" title="Voir"><Eye className="w-4 h-4" /></button></div>)}
                            {m.documents_supp_path && (<div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800"><FolderOpen className="w-5 h-5 text-slate-600 dark:text-slate-400 flex-shrink-0" /><div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-700 dark:text-slate-300">Documents supp.</p><p className="text-xs text-slate-500 dark:text-slate-400 truncate">{m.documents_supp_path.split('_').pop()}</p></div><button onClick={() => openPreview(m.documents_supp_path, 'Documents supp', 'docs')} className="p-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white transition-colors" title="Voir"><Eye className="w-4 h-4" /></button></div>)}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{m.montant_ttc ? `${m.montant_ttc.toLocaleString('fr-FR')} €` : (m.montant_ht ? `${m.montant_ht.toLocaleString('fr-FR')} € HT` : '-')}</p>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditMarche(m)} className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors" title="Modifier"><Edit3 className="w-5 h-5" /></button>
                          <button onClick={() => handleDeleteMarche(m.id)} className="p-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Supprimer"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* INTERVENTIONS */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <span className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"><Calendar className="w-5 h-5" /></span>
                Suivi des Interventions ({interventions.length})
              </h2>
              <button onClick={() => { setEditingIntervention(null); setInterventionForm({ contrat_id: '', numero_dossier: '', intervenant: '', date_debut: new Date().toISOString().split('T')[0], date_fin: '', description: '', montant: '' }); setInterventionFile(null); setActiveModal('intervention'); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl text-base font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95">
                <Plus className="w-5 h-5" /> Nouvelle intervention
              </button>
            </div>
            <div className="bg-white dark:bg-slate-950 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              {interventions.length === 0 ? <div className="p-12 text-center text-slate-500 text-base">Aucune intervention.</div> : (
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-slate-500 uppercase">N° Dossier</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-slate-500 uppercase">Intervenant</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-slate-500 uppercase">Période</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-slate-500 uppercase">Marché</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-slate-500 uppercase">Objet</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-slate-500 uppercase">Montant</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-slate-500 uppercase">Rapport</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {interventions.map((int) => (
                      <tr key={int.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-bold"><Hash className="w-4 h-4" />{int.numero_dossier || 'N/A'}</span></td>
                        <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold">{int.intervenant?.charAt(0) || '?'}</div><span className="text-base font-semibold text-slate-900 dark:text-slate-100">{int.intervenant || '-'}</span></div></td>
                        <td className="px-6 py-4 text-base text-slate-600 dark:text-slate-300"><div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>{int.date_debut ? new Date(int.date_debut).toLocaleDateString('fr-FR') : '-'}</span>{int.date_fin && int.date_fin !== int.date_debut && <span className="text-slate-400">→ {new Date(int.date_fin).toLocaleDateString('fr-FR')}</span>}</div></td>
                        <td className="px-6 py-4 text-base text-indigo-600 dark:text-indigo-400 font-semibold">{int.contrats?.numero_marche || '-'}</td>
                        <td className="px-6 py-4 text-base text-slate-600 dark:text-slate-300 max-w-xs truncate" title={int.description}>{int.description || '-'}</td>
                        <td className="px-6 py-4 text-base text-slate-900 dark:text-slate-100 text-right font-black">{int.montant ? `${int.montant.toLocaleString('fr-FR')} €` : '-'}</td>
                        <td className="px-6 py-4 text-center">
                          {int.rapport_path ? (
                            <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 mx-auto max-w-[200px]">
                              <div className="flex-1 min-w-0 text-left"><p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Rapport</p><p className="text-xs text-slate-500 dark:text-slate-400 truncate">{int.rapport_path.split('_').pop()}</p></div>
                              <button onClick={() => openPreview(int.rapport_path, 'Rapport intervention', 'rapport', 'intervention-reports')} className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex-shrink-0" title="Voir"><Eye className="w-4 h-4" /></button>
                            </div>
                          ) : <span className="text-sm text-slate-400 italic">Aucun</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => openEditIntervention(int)}
                              className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors" 
                              title="Modifier"
                            >
                              <Edit3 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteIntervention(int.id)}
                              className="p-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" 
                              title="Supprimer"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* MODALE PRÉVISUALISATION */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setPreviewDoc(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-950 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center"><FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /></div>
                  <div><h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{previewDoc.name}</h3><p className="text-sm text-slate-500">Document du marché ou intervention</p></div>
                </div>
                <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X className="h-6 w-6" /></button>
              </div>
              <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-950">
                <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-base font-medium transition-colors"><Download className="w-4 h-4" /> Télécharger</button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-base font-medium transition-colors"><Printer className="w-4 h-4" /> Imprimer</button>
                <button onClick={handleOpenNewTab} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-base font-medium transition-colors"><ExternalLink className="w-4 h-4" /> Nouvel onglet</button>
              </div>
              <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-900 relative">
                {previewLoading ? (<div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-indigo-600" /></div>) : (<iframe src={previewDoc.url} className="w-full h-full min-h-[60vh] border-0" title={`Aperçu ${previewDoc.name}`} />)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALES FORMULAIRES */}
      <AnimatePresence>
        {activeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setActiveModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-950 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900 sticky top-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {activeModal === 'contact' && (editingContact ? 'Modifier le contact' : 'Ajouter un contact')}
                  {activeModal === 'marche' && (editingMarche ? 'Modifier le marché' : 'Ajouter un marché')}
                  {activeModal === 'intervention' && (editingIntervention ? 'Modifier l\'intervention' : 'Ajouter une intervention')}
                  {activeModal === 'prestataire' && 'Modifier la fiche prestataire'}
                </h3>
                <button onClick={() => { setActiveModal(null); setEditingMarche(null); setEditingIntervention(null); setEditingContact(null); }} className="text-slate-400 hover:text-slate-600"><X className="h-6 w-6" /></button>
              </div>
              <div className="p-6 space-y-4">
                {activeModal === 'contact' && (
                  <form onSubmit={editingContact ? handleUpdateContact : handleAddContact} className="space-y-4">
                    <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nom complet *</label><input required placeholder="Nom complet" value={newContact.nom} onChange={e => setNewContact({...newContact, nom: e.target.value})} className="w-full px-4 py-3.5 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" /></div>
                    <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Fonction</label><input placeholder="Fonction" value={newContact.fonction} onChange={e => setNewContact({...newContact, fonction: e.target.value})} className="w-full px-4 py-3.5 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" /></div>
                    <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Adresse email</label><input type="email" placeholder="email@exemple.com" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} className="w-full px-4 py-3.5 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" /></div>
                    <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Numéro de téléphone</label><input placeholder="01 23 45 67 89" value={newContact.telephone} onChange={e => setNewContact({...newContact, telephone: e.target.value})} className="w-full px-4 py-3.5 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" /></div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95 mt-2">{editingContact ? 'Mettre à jour le contact' : 'Enregistrer le contact'}</button>
                  </form>
                )}

                {activeModal === 'prestataire' && (
                  <form onSubmit={handleUpdatePrestataire} className="space-y-4">
                    <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Raison Sociale *</label><input required value={prestataireForm.societe} onChange={e => setPrestataireForm({...prestataireForm, societe: e.target.value})} className="w-full px-4 py-3.5 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">N° SIRET</label><input value={prestataireForm.siret} onChange={e => setPrestataireForm({...prestataireForm, siret: e.target.value})} className="w-full px-4 py-3.5 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                      <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Contact principal</label><input value={prestataireForm.contact_nom} onChange={e => setPrestataireForm({...prestataireForm, contact_nom: e.target.value})} className="w-full px-4 py-3.5 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                    </div>
                    <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Adresse</label><input value={prestataireForm.adresse} onChange={e => setPrestataireForm({...prestataireForm, adresse: e.target.value})} className="w-full px-4 py-3.5 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Téléphone</label><input value={prestataireForm.telephone} onChange={e => setPrestataireForm({...prestataireForm, telephone: e.target.value})} className="w-full px-4 py-3.5 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                      <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email</label><input type="email" value={prestataireForm.email} onChange={e => setPrestataireForm({...prestataireForm, email: e.target.value})} className="w-full px-4 py-3.5 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                      <button type="button" onClick={() => setActiveModal(null)} className="px-5 py-3 rounded-xl text-base font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Annuler</button>
                      <button type="submit" disabled={uploading} className="flex items-center gap-2 px-5 py-3 rounded-xl text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 disabled:bg-indigo-400 transition-all hover:scale-[1.02] active:scale-95">
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        {uploading ? 'Sauvegarde...' : 'Enregistrer'}
                      </button>
                    </div>
                  </form>
                )}

                {activeModal === 'marche' && (
                  <form onSubmit={handleSaveMarche} className="space-y-4">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                      <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 uppercase mb-3">Côté GESTA - Identification</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">N° Tiers *</label><input required value={marcheForm.numero_tiers} onChange={e => setMarcheForm({...marcheForm, numero_tiers: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                        <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">N° Marché *</label><input required value={marcheForm.numero_marche} onChange={e => setMarcheForm({...marcheForm, numero_marche: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                      </div>
                    </div>
                    <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Objet du marché *</label><input required value={marcheForm.objet} onChange={e => setMarcheForm({...marcheForm, objet: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Budget</label><select value={marcheForm.budget} onChange={e => setMarcheForm({...marcheForm, budget: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none"><option value="Principale">Principale</option><option value="Annexe">Annexe</option></select></div>
                      <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Section</label><select value={marcheForm.section} onChange={e => setMarcheForm({...marcheForm, section: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none"><option value="Fonctionnement">Fonctionnement</option><option value="Investissement">Investissement</option></select></div>
                      <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Imputation</label><input value={marcheForm.imputation} onChange={e => setMarcheForm({...marcheForm, imputation: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                    </div>
                    <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Type de contrat</label><select value={marcheForm.type_contrat} onChange={e => setMarcheForm({...marcheForm, type_contrat: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none"><option value="Accord cadre avec un seul opérateur mono attributaire">Accord cadre avec un seul opérateur mono attributaire</option><option value="Accord cadre avec plusieurs opérateurs">Accord cadre avec plusieurs opérateurs</option><option value="Marché à bons de commande">Marché à bons de commande</option><option value="Marché forfaitaire">Marché forfaitaire</option><option value="Marché à prix unitaires">Marché à prix unitaires</option></select></div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Montant HT (€)</label><input type="number" step="0.01" value={marcheForm.montant_ht} onChange={e => setMarcheForm({...marcheForm, montant_ht: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                      <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Montant TTC (€)</label><input type="number" step="0.01" value={marcheForm.montant_ttc} onChange={e => setMarcheForm({...marcheForm, montant_ttc: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                      <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Nb interventions/an</label><input type="number" min="0" placeholder="Optionnel" value={marcheForm.nb_interventions_an} onChange={e => setMarcheForm({...marcheForm, nb_interventions_an: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                      <h4 className="text-sm font-bold text-amber-700 dark:text-amber-300 uppercase mb-3">Validité du Contrat</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Notification</label><input type="date" value={marcheForm.date_notification} onChange={e => setMarcheForm({...marcheForm, date_notification: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                        <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Début de contrat</label><input type="date" value={marcheForm.date_debut} onChange={e => setMarcheForm({...marcheForm, date_debut: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                        <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Fin de contrat</label><input type="date" value={marcheForm.date_fin} onChange={e => setMarcheForm({...marcheForm, date_fin: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 block flex items-center gap-1"><Paperclip className="w-4 h-4" /> Pièces Jointes du Marché</label>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm text-slate-500 mb-1.5 block">CCTP</label><input type="file" accept=".pdf,.doc,.docx" onChange={e => setMarcheFiles({...marcheFiles, cctp: e.target.files?.[0] || null})} className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700" />{marcheFiles.cctp && <p className="text-sm text-emerald-600 mt-1.5">✅ {marcheFiles.cctp.name}</p>}</div>
                        <div><label className="text-sm text-slate-500 mb-1.5 block">CCAP</label><input type="file" accept=".pdf,.doc,.docx" onChange={e => setMarcheFiles({...marcheFiles, ccap: e.target.files?.[0] || null})} className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700" />{marcheFiles.ccap && <p className="text-sm text-emerald-600 mt-1.5">✅ {marcheFiles.ccap.name}</p>}</div>
                        <div><label className="text-sm text-slate-500 mb-1.5 block">BPU</label><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={e => setMarcheFiles({...marcheFiles, bpu: e.target.files?.[0] || null})} className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700" />{marcheFiles.bpu && <p className="text-sm text-emerald-600 mt-1.5">✅ {marcheFiles.bpu.name}</p>}</div>
                        <div><label className="text-sm text-slate-500 mb-1.5 block">AE (Acte d'Engagement)</label><input type="file" accept=".pdf,.doc,.docx" onChange={e => setMarcheFiles({...marcheFiles, ae: e.target.files?.[0] || null})} className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700" />{marcheFiles.ae && <p className="text-sm text-emerald-600 mt-1.5">✅ {marcheFiles.ae.name}</p>}</div>
                        <div className="col-span-2"><label className="text-sm text-slate-500 mb-1.5 block">Documents supplémentaires</label><input type="file" accept=".pdf,.doc,.docx,.zip" onChange={e => setMarcheFiles({...marcheFiles, documents_supp: e.target.files?.[0] || null})} className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700" />{marcheFiles.documents_supp && <p className="text-sm text-emerald-600 mt-1.5">✅ {marcheFiles.documents_supp.name}</p>}</div>
                      </div>
                    </div>
                    <button type="submit" disabled={uploading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-indigo-500/20 disabled:bg-indigo-400 flex justify-center items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 mt-2">
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingMarche ? 'Mettre à jour le marché' : 'Enregistrer le marché')}
                    </button>
                  </form>
                )}

                {activeModal === 'intervention' && (
                  <form onSubmit={handleSaveIntervention} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">N° Dossier *</label><input required placeholder="ex: 12345-PML" value={interventionForm.numero_dossier} onChange={e => setInterventionForm({...interventionForm, numero_dossier: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                      <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Intervenant *</label><input required placeholder="Nom du technicien" value={interventionForm.intervenant} onChange={e => setInterventionForm({...interventionForm, intervenant: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                    </div>
                    <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Marché lié *</label><select required value={interventionForm.contrat_id} onChange={e => setInterventionForm({...interventionForm, contrat_id: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none">
                      <option value="">-- Choisir un marché --</option>
                      {marches.map(m => <option key={m.id} value={m.id}>{m.numero_marche} - {m.nom_marche || m.objet}</option>)}
                    </select></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Date début *</label><input type="date" required value={interventionForm.date_debut} onChange={e => setInterventionForm({...interventionForm, date_debut: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                      <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Date fin</label><input type="date" value={interventionForm.date_fin} onChange={e => setInterventionForm({...interventionForm, date_fin: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                    </div>
                    <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Montant (€)</label><input type="number" step="0.01" placeholder="0.00" value={interventionForm.montant} onChange={e => setInterventionForm({...interventionForm, montant: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none" /></div>
                    <div><label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Objet / Observation *</label><textarea required rows={3} placeholder="Description de l'intervention" value={interventionForm.description} onChange={e => setInterventionForm({...interventionForm, description: e.target.value})} className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none" /></div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1"><Paperclip className="w-4 h-4" /> Rapport du technicien</label>
                      <input type="file" accept=".pdf,.txt,.jpg,.jpeg,.png,.doc,.docx" onChange={e => setInterventionFile(e.target.files?.[0] || null)} className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700" />
                      {interventionFile && <p className="text-sm text-emerald-600 mt-1.5 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {interventionFile.name}</p>}
                    </div>
                    <button type="submit" disabled={uploading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-indigo-500/20 disabled:bg-indigo-400 flex justify-center items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 mt-2">
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingIntervention ? 'Mettre à jour l\'intervention' : 'Enregistrer l\'intervention')}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}