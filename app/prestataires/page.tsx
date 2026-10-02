'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Sidebar from '../../components/Sidebar';
import { Search, Plus, Building2, MapPin, FileText, AlertTriangle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PrestatairesPage() {
  const router = useRouter();
  const [prestataires, setPrestataires] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // On récupère les prestataires, leurs contacts ET le nombre de contrats associés
      const { data, error } = await supabase
        .from('prestataires')
        .select(`
          *,
          contacts (nom, prenom, email, est_principal),
          contrats (id, date_fin)
        `)
        .order('societe', { ascending: true });

      if (error) {
        console.error('Erreur:', error.message);
      } else {
        setPrestataires(data || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [router]);

  const filteredPrestataires = prestataires.filter(p => 
    p.societe?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ville?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPrincipalContact = (contacts: any[]) => {
    if (!contacts || contacts.length === 0) return { nom: 'Non renseigné', email: '-' };
    const principal = contacts.find((c: any) => c.est_principal) || contacts[0];
    const nomComplet = `${principal.prenom || ''} ${principal.nom || ''}`.trim();
    return { nom: nomComplet || 'Non renseigné', email: principal.email || '-' };
  };

  const getUrgencyStatus = (contrats: any[]) => {
    if (!contrats || contrats.length === 0) return { label: 'Aucun contrat', color: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' };
    const today = new Date();
    const hasUrgent = contrats.some(c => {
      if (!c.date_fin) return false;
      const diffDays = Math.ceil((new Date(c.date_fin).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 60 && diffDays >= 0;
    });
    const hasExpired = contrats.some(c => {
      if (!c.date_fin) return false;
      const diffDays = Math.ceil((new Date(c.date_fin).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays < 0;
    });

    if (hasExpired) return { label: 'Contrat échu', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' };
    if (hasUrgent) return { label: 'Échéance proche', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' };
    return { label: 'Tout va bien', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' };
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">Chargement des prestataires...</div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Prestataires</h1>
          <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm">A</div>
        </header>

        <div className="p-8">
          {/* Barre d'actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher une société, une ville..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <button
              onClick={() => router.push('/ajouter-prestataire')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              Nouveau prestataire
            </button>
          </div>

          {/* BENTO GRID */}
          {filteredPrestataires.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
              <Building2 className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">Aucun prestataire trouvé.</p>
            </div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.05 } }
              }}
            >
              {filteredPrestataires.map((prestataire) => {
                const contact = getPrincipalContact(prestataire.contacts);
                const status = getUrgencyStatus(prestataire.contrats);
                const nbContrats = prestataire.contrats?.length || 0;

                return (
                  <motion.div
                    key={prestataire.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="group bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer"
                    onClick={() => router.push(`/prestataires/${prestataire.id}`)}
                  >
                    {/* En-tête de la carte */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {prestataire.societe?.charAt(0).toUpperCase() || 'P'}
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                        {status.label.includes('Échéance') || status.label.includes('échu') ? <AlertTriangle className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                        {status.label}
                      </span>
                    </div>

                    {/* Infos principales */}
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1 line-clamp-1">{prestataire.societe}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mb-4">
                      <MapPin className="h-3.5 w-3.5" />
                      {prestataire.ville || 'Ville non renseignée'}
                    </div>

                    {/* Détails contact */}
                    <div className="space-y-2 mb-5 pb-5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                          {contact.nom.charAt(0)}
                        </div>
                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{contact.nom}</span>
                      </div>
                      {contact.email !== '-' && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 pl-8 truncate">{contact.email}</p>
                      )}
                    </div>

                    {/* Footer de la carte */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-lg">
                        <FileText className="h-3.5 w-3.5" />
                        {nbContrats} contrat{nbContrats > 1 ? 's' : ''}
                      </div>
                      <span className="flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                        Voir la fiche <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          <div className="mt-6 flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
            <p>{filteredPrestataires.length} prestataire(s) affiché(s)</p>
          </div>
        </div>
      </main>
    </div>
  );
}