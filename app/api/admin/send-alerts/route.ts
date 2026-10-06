import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function POST() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;

    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
    if (!resendKey) throw new Error("RESEND_API_KEY manquante");

    const supabaseAdmin = createClient(url!, serviceKey);
    const resend = new Resend(resendKey);

    // 1. Calcul des dates cibles
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const d365 = new Date(); d365.setDate(today.getDate() + 365);
    const d180 = new Date(); d180.setDate(today.getDate() + 180);
    const d60 = new Date(); d60.setDate(today.getDate() + 60);

    // 2. On récupère TOUS les contrats qui finissent dans les 365 prochains jours
    const { data: contrats, error: dbError } = await supabaseAdmin
      .from('contrats')
      .select(`id, nom_marche, date_fin, prestataires ( societe )`)
      .gte('date_fin', todayStr)
      .lte('date_fin', d365.toISOString().split('T')[0])
      .order('date_fin', { ascending: true });

    if (dbError) throw new Error("Erreur DB: " + dbError.message);
    if (!contrats || contrats.length === 0) {
      return NextResponse.json({ success: true, message: "Aucun contrat à surveiller dans les 365 prochains jours." });
    }

    // 3. On trie les contrats dans les 3 paniers EXACTS
    const alert365 = contrats.filter(c => new Date(c.date_fin) > d180 && new Date(c.date_fin) <= d365);
    const alert180 = contrats.filter(c => new Date(c.date_fin) > d60 && new Date(c.date_fin) <= d180);
    const alert60 = contrats.filter(c => new Date(c.date_fin) <= d60);

    // Fonction pour générer le HTML d'un tableau
    const generateTable = (list: any[]) => {
      if (list.length === 0) return '<p style="color: #64748b; font-style: italic; padding: 10px;">Aucun contrat dans cette période.</p>';
      return `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead style="background-color: #f1f5f9;">
            <tr>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1;">Prestataire</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1;">Marché</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1;">Date de fin</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(c => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; color: #1e293b;">${c.prestataires?.societe || 'Inconnu'}</td>
                <td style="padding: 10px; color: #334155;">${c.nom_marche || 'Sans objet'}</td>
                <td style="padding: 10px; color: #dc2626; font-weight: bold;">${new Date(c.date_fin).toLocaleDateString('fr-FR')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    };

    // 4. Construction de l'email avec les 3 sections (365, 180, 60)
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
        <h2 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">📅 Rapport d'échéance des contrats</h2>
        <p>Bonjour, voici le suivi des contrats arrivant à échéance :</p>

        <h3 style="color: #ca8a04; background: #fef9c3; padding: 8px; border-radius: 6px;">🟡 Échéance à 1 an (365 jours) - ${alert365.length} contrat(s)</h3>
        ${generateTable(alert365)}

        <h3 style="color: #ea580c; background: #ffedd5; padding: 8px; border-radius: 6px;">🟠 Échéance à 6 mois (180 jours) - ${alert180.length} contrat(s)</h3>
        ${generateTable(alert180)}

        <h3 style="color: #dc2626; background: #fee2e2; padding: 8px; border-radius: 6px;">🔴 Échéance à 2 mois (60 jours) - ${alert60.length} contrat(s)</h3>
        ${generateTable(alert60)}

        <p style="margin-top: 24px; font-size: 14px; color: #64748b;">Rapport généré automatiquement par GESTA.</p>
      </div>
    `;

    // 5. Envoi de l'email
    const targetEmail = 'gesta16000@gmail.com';
    
    const { error: emailError } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: [targetEmail],
      subject: `📅 Rapport GESTA : Suivi des échéances (1 an, 6 mois, 2 mois)`,
      html: htmlContent,
    });

    if (emailError) throw new Error("Erreur Resend: " + emailError.message);

    // 6. Sauvegarde du log
    try {
      await supabaseAdmin.from('email_logs').insert({
        destinataires: [targetEmail],
        sujet: `Rapport échéances: ${contrats.length} contrat(s) surveillés`,
        statut: 'success',
        date_envoi: new Date().toISOString()
      });
    } catch (e) { console.log("Log non sauvegardé"); }

    return NextResponse.json({ success: true, message: `✅ Rapport envoyé ! ${alert365.length + alert180.length + alert60.length} contrat(s) surveillé(s).` });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}