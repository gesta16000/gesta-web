'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function AjouterPrestatairePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const formData = new FormData(e.currentTarget);

    const { error } = await supabase.from('prestataires').insert({
      societe: formData.get('societe'),
      contact_principal: formData.get('contact_principal'),
      fonction: formData.get('fonction'),
      email: formData.get('email'),
      telephone_fixe: formData.get('telephone_fixe'),
      telephone_mobile: formData.get('telephone_mobile'),
      adresse: formData.get('adresse'),
      code_postal: formData.get('code_postal'),
      ville: formData.get('ville'),
    });

    setLoading(false);

    if (error) {
      setMessage('❌ Erreur : ' + error.message);
    } else {
      setMessage('✅ Prestataire ajouté avec succès !');
      setTimeout(() => router.push('/prestataires'), 1500);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Ajouter un Prestataire</h1>

      {message && (
        <div className={`p-4 rounded mb-6 ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Société *</label>
          <input name="societe" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Contact principal</label>
            <input name="contact_principal" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Fonction</label>
            <input name="fonction" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input name="email" type="email" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Téléphone fixe</label>
            <input name="telephone_fixe" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Téléphone mobile</label>
          <input name="telephone_mobile" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Adresse</label>
          <input name="adresse" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Code postal</label>
            <input name="code_postal" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Ville</label>
            <input name="ville" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/prestataires')}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}