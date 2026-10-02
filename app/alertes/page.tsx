'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Sidebar from '../../components/Sidebar';
import { Bell, CheckCircle2, Clock, AlertTriangle, Calendar, Building2, FileText, Loader2 } from 'lucide-react';

export default function AlertesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [alertes, setAlertes] = useState<any[]>([]);
  const [treatingId, setTreatingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      // On récupère les actions avec les infos du contrat et du prestataire
      const { data } = await supabase
        .from('actions')
        .select(`
          *,
          contrats (
            nom_marche,
            date_fin,
            prestataires ( societe )
          )
        `)
        .neq('statut', 'termine')
        .order('date_echeance', { ascending: true });

      setAlertes(data || []);
      setLoading(false);
    };
    fetchData();
  }, [router]);

  const handleTraiter = async (id: string) => {
    setTreatingId(id);
    await supabase.from('actions').update({ statut: 'termine', completed_at: new Date().toISOString() }).eq('id', id);
    setAlertes(prev => prev.filter(a => a.id !== id));
    setTreatingId(null);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-indigo-600 font-medium animate-pulse flex items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Chargement du centre de pilotage...
      </div>
    </div>
  );

  // Séparation par urgence
  const urgents = alertes.filter(a => a.priorite === 'haute' || a.priorite === 'urgente');
  const moyens = alertes.filter(a => a.priorite === 'moyenne');
  const faibles = alertes.filter(a => a.priorite === 'basse');

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8 shadow-sm sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" /> Centre d'Alertes
            </h1>
            <p className="text-xs text-slate-500">Pilotez vos échéances et actions en temps réel</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
              {alertes.length} action(s) en attente
            </span>
          </div>
        </header>

        <div className="p-8">
          {alertes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-green-100 p-4 rounded-full mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Tout est sous contrôle ! 🎉</h2>
              <p className="text-slate-500 mt-2">Aucune action en attente. Profitez de votre journée.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <AlertColumn title="🔴 Urgent / Haute priorité" items={urgents} onTraiter={handleTraiter} treatingId={treatingId} color="border-l-red-500 bg-red-50/30" />
              <AlertColumn title="🟠 Moyenne priorité" items={moyens} onTraiter={handleTraiter} treatingId={treatingId} color="border-l-amber-500 bg-amber-50/30" />
              <AlertColumn title="🟢 Basse priorité" items={faibles} onTraiter={handleTraiter} treatingId={treatingId} color="border-l-emerald-500 bg-emerald-50/30" />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function AlertColumn({ title, items, onTraiter, treatingId, color }: any) {
  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 px-1">{title} ({items.length})</h3>
      <div className="space-y-3 flex-1">
        {items.length === 0 && (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">
            Aucune action
          </div>
        )}
        {items.map((action: any) => (
          <div key={action.id} className={`bg-white p-4 rounded-xl shadow-sm border border-slate-100 border-l-4 ${color} hover:shadow-md transition-all group`}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{action.type_action || 'Action'}</span>
              {action.date_echeance && (
                <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  <Calendar className="w-3 h-3" /> {new Date(action.date_echeance).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
            <h4 className="font-bold text-slate-900 mb-1">{action.titre}</h4>
            {action.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{action.description}</p>}
            
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 pt-2 border-t border-slate-100">
              <Building2 className="w-3 h-3" /> {action.contrats?.prestataires?.societe || 'Prestataire inconnu'}
              <span className="text-slate-300">•</span>
              <FileText className="w-3 h-3" /> {action.contrats?.nom_marche || 'Contrat inconnu'}
            </div>

            <button 
              onClick={() => onTraiter(action.id)}
              disabled={treatingId === action.id}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {treatingId === action.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Marquer comme traité
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}