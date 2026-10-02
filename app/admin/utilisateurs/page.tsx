'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Sidebar from '../../../components/Sidebar';
import { Shield, User, Plus, X, Save, Loader2, Trash2, Eye, EyeOff } from 'lucide-react';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'lecture' });
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
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
    if (error) { setMessage({ type: 'error', text: 'Erreur sauvegarde' }); fetchUsers(); }
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
        setNewUser({ email: '', password: '', role: 'lecture' });
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

  const handleDeleteUser = async (userId: string, email: string) => {
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
          {message && <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>{message.text}</div>}
          <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900"><tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rôle</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> {user.email}</td>
                    <td className="px-6 py-4">
                      <select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)} className={`text-sm border rounded-lg px-3 py-1.5 font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : user.role === 'ecriture' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                        <option value="admin">Administrateur</option>
                        <option value="ecriture">Écriture</option>
                        <option value="lecture">Lecture seule</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleDeleteUser(user.id, user.email)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Créer un utilisateur</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label><input type="email" required value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mot de passe</label>
                <div className="relative"><input type={showPassword ? "text" : "password"} required minLength={6} value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rôle</label>
                <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  <option value="lecture">Lecture seule</option><option value="ecriture">Écriture</option><option value="admin">Administrateur</option>
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
    </div>
  );
}