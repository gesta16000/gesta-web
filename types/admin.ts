// Types partagés pour les pages et API d'administration (GESTA).

/** Ligne de la table Supabase `email_logs`, telle qu'affichée dans le
 * tableau de bord admin (derniers envois d'emails). */
export interface EmailLog {
  id: string;
  destinataires: string[];
  sujet?: string;
  statut: 'success' | 'error';
  date_envoi: string;
  message?: string;
  type_envoi?: string;
}

/** Ligne de la table Supabase `profiles`, telle qu'affichée dans le
 * tableau de bord admin (derniers utilisateurs inscrits). */
export interface UserProfile {
  id: string;
  email: string;
  nom_complet?: string;
  role: 'admin' | 'lecture' | string;
  created_at: string;
}
