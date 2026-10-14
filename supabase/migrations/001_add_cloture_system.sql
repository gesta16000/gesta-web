-- ============================================================================
-- Migration : Système de clôture comptable
-- GESTA — à exécuter manuellement dans Supabase Studio (SQL Editor)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table periodes_cloture
-- ----------------------------------------------------------------------------
create table if not exists public.periodes_cloture (
  id uuid primary key default gen_random_uuid(),
  annee integer not null,
  mois integer check (mois between 1 and 12), -- nullable = clôture annuelle complète
  statut text not null default 'ouvert' check (statut in ('ouvert', 'cloture')),
  cloture_par uuid references public.profiles(id),
  cloture_a timestamptz,
  deverrouille_par uuid references public.profiles(id),
  deverrouille_a timestamptz,
  raison_deverrouillage text,
  created_at timestamptz not null default now(),

  -- Une seule période par (année, mois) — mois NULL = ligne annuelle unique
  constraint periodes_cloture_unique unique nulls not distinct (annee, mois)
);

create index if not exists idx_periodes_cloture_annee_mois
  on public.periodes_cloture (annee, mois);

-- ----------------------------------------------------------------------------
-- 2. RLS : lecture ouverte aux utilisateurs connectés, écriture réservée admin
-- ----------------------------------------------------------------------------
alter table public.periodes_cloture enable row level security;

drop policy if exists "Lecture périodes pour utilisateurs connectés" on public.periodes_cloture;
create policy "Lecture périodes pour utilisateurs connectés"
  on public.periodes_cloture for select
  to authenticated
  using (true);

drop policy if exists "Écriture périodes réservée aux admins" on public.periodes_cloture;
create policy "Écriture périodes réservée aux admins"
  on public.periodes_cloture for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 3. Fonction trigger : bloque l'écriture si la période est clôturée
--
--    Référence de période par table :
--      - depenses : annee_imputation + mois extrait de date_depense
--      - contrats : année/mois extraits de date_notification
--
--    Une clôture annuelle (mois IS NULL) bloque tous les mois de cette année.
--    Une clôture mensuelle ne bloque que ce mois précis.
-- ----------------------------------------------------------------------------
create or replace function public.check_periode_non_cloturee()
returns trigger
language plpgsql
security definer
as $$
declare
  v_annee integer;
  v_mois integer;
  v_date date;
begin
  if TG_TABLE_NAME = 'depenses' then
    v_annee := coalesce(NEW.annee_imputation, OLD.annee_imputation);
    v_date := coalesce(NEW.date_depense, OLD.date_depense);
    v_mois := case when v_date is not null then extract(month from v_date) else null end;
  elsif TG_TABLE_NAME = 'contrats' then
    v_date := coalesce(NEW.date_notification, OLD.date_notification);
    v_annee := case when v_date is not null then extract(year from v_date) else null end;
    v_mois := case when v_date is not null then extract(month from v_date) else null end;
  end if;

  -- Si on ne peut pas déterminer l'année (ex: date_notification absente sur un
  -- contrat), on laisse passer : on ne bloque que ce qu'on peut rattacher à
  -- une période connue.
  if v_annee is null then
    return coalesce(NEW, OLD);
  end if;

  if exists (
    select 1 from public.periodes_cloture
    where annee = v_annee
      and statut = 'cloture'
      and (mois is null or mois = v_mois)
  ) then
    raise exception 'Période %-% clôturée : modification interdite', v_annee, coalesce(v_mois::text, 'ANNEE')
      using errcode = '42501'; -- insufficient_privilege
  end if;

  return coalesce(NEW, OLD);
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Application des triggers sur depenses et contrats
-- ----------------------------------------------------------------------------
drop trigger if exists trg_check_cloture_depenses on public.depenses;
create trigger trg_check_cloture_depenses
  before insert or update or delete on public.depenses
  for each row execute function public.check_periode_non_cloturee();

drop trigger if exists trg_check_cloture_contrats on public.contrats;
create trigger trg_check_cloture_contrats
  before insert or update or delete on public.contrats
  for each row execute function public.check_periode_non_cloturee();
