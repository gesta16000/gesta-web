import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    // Date limite : il y a 2 ans
    const deuxAnsAgo = new Date();
    deuxAnsAgo.setFullYear(deuxAnsAgo.getFullYear() - 2);
    const dateLimite = deuxAnsAgo.toISOString().split('T')[0];

    // 1. ARCHIVER LES DÉPENSES
    const { data: depensesToArchive, error: errDepSelect } = await supabase
      .from('depenses')
      .select('*')
      .lt('date_depense', dateLimite);

    if (errDepSelect) throw new Error('Erreur sélection dépenses: ' + errDepSelect.message);

    let depensesArchivees = 0;
    if (depensesToArchive && depensesToArchive.length > 0) {
      // Insérer dans la table archive
      const { error: errDepInsert } = await supabase
        .from('depenses_archivees')
        .insert(depensesToArchive);
      
      if (errDepInsert) throw new Error('Erreur insert archive dépenses: ' + errDepInsert.message);

      // Supprimer de la table principale
      const ids = depensesToArchive.map(d => d.id);
      const { error: errDepDelete } = await supabase
        .from('depenses')
        .delete()
        .in('id', ids);
      
      if (errDepDelete) throw new Error('Erreur delete dépenses: ' + errDepDelete.message);
      
      depensesArchivees = depensesToArchive.length;
    }

    // 2. ARCHIVER LES CLÔTURES
    const { data: cloturesToArchive, error: errClotSelect } = await supabase
      .from('periodes_cloture')
      .select('*')
      .lt('created_at', dateLimite);

    if (errClotSelect) throw new Error('Erreur sélection clôtures: ' + errClotSelect.message);

    let cloturesArchivees = 0;
    if (cloturesToArchive && cloturesToArchive.length > 0) {
      const { error: errClotInsert } = await supabase
        .from('periodes_cloture_archivees')
        .insert(cloturesToArchive);
      
      if (errClotInsert) throw new Error('Erreur insert archive clôtures: ' + errClotInsert.message);

      const ids = cloturesToArchive.map(c => c.id);
      const { error: errClotDelete } = await supabase
        .from('periodes_cloture')
        .delete()
        .in('id', ids);
      
      if (errClotDelete) throw new Error('Erreur delete clôtures: ' + errClotDelete.message);
      
      cloturesArchivees = cloturesToArchive.length;
    }

    // 3. ARCHIVER LES LOGS EMAILS
    const { data: logsToArchive, error: errLogSelect } = await supabase
      .from('email_logs')
      .select('*')
      .lt('created_at', dateLimite);

    if (errLogSelect) throw new Error('Erreur sélection logs: ' + errLogSelect.message);

    let logsArchives = 0;
    if (logsToArchive && logsToArchive.length > 0) {
      const { error: errLogInsert } = await supabase
        .from('email_logs_archivees')
        .insert(logsToArchive);
      
      if (errLogInsert) throw new Error('Erreur insert archive logs: ' + errLogInsert.message);

      const ids = logsToArchive.map(l => l.id);
      const { error: errLogDelete } = await supabase
        .from('email_logs')
        .delete()
        .in('id', ids);
      
      if (errLogDelete) throw new Error('Erreur delete logs: ' + errLogDelete.message);
      
      logsArchives = logsToArchive.length;
    }

    return NextResponse.json({
      success: true,
      message: `Archivage terminé. Données avant le ${dateLimite} déplacées vers les archives.`,
      stats: {
        depenses: depensesArchivees,
        clotures: cloturesArchivees,
        email_logs: logsArchives,
        total: depensesArchivees + cloturesArchivees + logsArchives
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}