'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Sidebar from '../../../components/Sidebar';
import { Shield, User, Plus, X, Save, Loader2, Trash2, Eye, EyeOff, CheckCircle2, Edit3 } from 'lucide-react';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({ email: '', nom_complet: '', password: '', role: 'lecture' });
  const [editForm, setEditForm] = useState({ email: '', nom_complet: '', password: '', role: 'lecture' });
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setCurrentUserId(user.id);
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') { router.push('/dashboard'); return; }
      await fetchUsers();
    })();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) { 
      setMessage({ type: 'error', text: 'Erreur sauvegarde' }); 
      fetchUsers(); 
    } else {
      setMessage({ type: 'success', text: `Rôle mis à jour : ${newRole}` });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Utilisateur créé !' });
        setNewUser({ email: '', nom_complet: '', password: '', role: 'lecture' });
        setShowPassword(false);
        setIsModalOpen(false);
        await fetchUsers();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur réseau' });
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditForm({
      email: user.email || '',
      nom_complet: user.nom_complet || '',
      password: '', // On ne pré-remplit pas le mot de passe par sécurité
      role: user.role || 'lecture'
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUpdating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: editingUser.id, ...editForm }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Utilisateur modifié !' });
        setIsEditModalOpen(false);
        setEditingUser(null);
        setEditForm({ email: '', nom_complet: '', password: '', role: 'lecture' });
        await fetchUsers();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur réseau' });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (userId === currentUserId) {
      alert('⚠️ Vous ne pouvez pas supprimer votre propre compte !');
      return;
    }
    if (!confirm(`Supprimer ${email} ?`)) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(users.filter(u => u.id !== userId));
        setMessage({ type: 'success', text: 'Utilisateur supprimé.' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch {
      alert('Erreur réseau');
    }
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-600" /> Gestion des Utilisateurs</h1>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> Créer</button>
        </header>
        <div className="p-8 max-w-5xl mx-auto">
          {message && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'}`}>
              {message.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
              {message.text}
            </div>
          )}
          <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900"><tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rôle</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> {user.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{user.nom_complet || '-'}</td>
                    <td className="px-6 py-4">
                      <select 
  value={user.role} 
  onChange={(e) => handleRoleChange(user.id, e.target.value)} 
  className={`text-sm font-bold border rounded-lg px-3 py-1.5 cursor-pointer outline-none transition-all ${
    user.role === 'admin' 
      ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-100 dark:border-purple-700' 
      : user.role === 'ecriture' 
      ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-700' 
      : 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600'
  }`}
>
  <option value="admin" className="bg-white text-purple-800 dark:bg-slate-900 dark:text-purple-100">Administrateur</option>
  <option value="ecriture" className="bg-white text-blue-800 dark:bg-slate-900 dark:text-blue-100">Écriture</option>
  <option value="lecture" className="bg-white text-gray-800 dark:bg-slate-900 dark:text-gray-100">Lecture seule</option>
</select>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openEditModal(user)} 
                          className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          title="Modifier"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id, user.email)} 
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title={user.id === currentUserId ? 'Vous ne pouvez pas supprimer votre propre compte' : 'Supprimer'}
                        >
                          <Trash2 className={`w-4 h-4 ${user.id === currentUserId ? 'opacity-30 cursor-not-allowed' : ''}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODALE CRÉATION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Créer un utilisateur</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                <input type="email" required value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nom complet</label>
                <input type="text" value={newUser.nom_complet} onChange={(e) => setNewUser({...newUser, nom_complet: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="Prénom Nom" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mot de passe *</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required minLength={6} value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rôle *</label>
                <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  <option value="lecture">Lecture seule</option>
                  <option value="ecriture">Écriture</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Annuler</button>
                <button type="submit" disabled={creating} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {creating ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE MODIFICATION */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Modifier l'utilisateur</h3>
              <button onClick={() => { setIsEditModalOpen(false); setEditingUser(null); }} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                <input type="email" required value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nom complet</label>
                <input type="text" value={editForm.nom_complet} onChange={(e) => setEditForm({...editForm, nom_complet: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="Prénom Nom" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nouveau mot de passe <span className="text-xs text-slate-500">(laisser vide pour ne pas changer)</span>
                </label>
                <div className="relative">
                  <input type={showEditPassword ? "text" : "password"} minLength={6} value={editForm.password} onChange={(e) => setEditForm({...editForm, password: e.target.value})} className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                  <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rôle *</label>
                <select value={editForm.role} onChange={(e) => setEditForm({...editForm, role: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  <option value="lecture">Lecture seule</option>
                  <option value="ecriture">Écriture</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingUser(null); }} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Annuler</button>
                <button type="submit" disabled={updating} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400">
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {updating ? 'Modification...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}