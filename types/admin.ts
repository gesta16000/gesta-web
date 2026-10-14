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

/** Ligne de la table Supabase `periodes_cloture` : état de clôture comptable
 * d'une année complète (mois = null) ou d'un mois précis. */
export interface PeriodeCloture {
  id: string;
  annee: number;
  mois: number | null;
  statut: 'ouvert' | 'cloture';
  cloture_par?: string | null;
  cloture_a?: string | null;
  deverrouille_par?: string | null;
  deverrouille_a?: string | null;
  raison_deverrouillage?: string | null;
  created_at: string;
}
