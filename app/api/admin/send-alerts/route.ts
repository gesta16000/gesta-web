import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // 1. Calculer les dates (aujourd'hui et dans 60 jours)
    const today = new Date();
    const in60Days = new Date();
    in60Days.setDate(today.getDate() + 60);

    const todayStr = today.toISOString().split('T')[0];
    const in60DaysStr = in60Days.toISOString().split('T')[0];

    // 2. Récupérer les contrats qui expirent dans cette fenêtre
    const { data: contrats, error } = await supabaseAdmin
      .from('contrats')
      .select(`
        id,
        nom_marche,
        date_fin,
        prestataires ( societe )
      `)
      .gte('date_fin', todayStr)
      .lte('date_fin', in60DaysStr)
      .order('date_fin', { ascending: true });

    if (error) throw error;

    if (!contrats || contrats.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Aucun contrat n\'arrive à échéance dans les 60 prochains jours.' 
      });
    }

    // 3. Générer le contenu HTML de l'email
    const rowsHtml = contrats.map((c: any) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px; color: #1e293b; font-weight: 600;">${c.prestataires?.societe || 'Inconnu'}</td>
        <td style="padding: 12px; color: #334155;">${c.nom_marche || 'Sans objet'}</td>
        <td style="padding: 12px; color: #dc2626; font-weight: bold;">${new Date(c.date_fin).toLocaleDateString('fr-FR')}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
        <h2 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">🚨 Alerte Échéance Contrats</h2>
        <p>Bonjour,</p>
        <p>Voici la liste des <strong>${contrats.length} contrat(s)</strong> arrivant à échéance dans les 60 prochains jours :</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <thead style="background-color: #f1f5f9;">
            <tr>
              <th style="padding: 12px; text-align: left; color: #475569;">Prestataire</th>
              <th style="padding: 12px; text-align: left; color: #475569;">Marché</th>
              <th style="padding: 12px; text-align: left; color: #475569;">Date de fin</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <p style="margin-top: 24px; font-size: 14px; color: #64748b;">
          Cet email a été généré automatiquement par l'application GESTA.
        </p>
      </div>
    `;

    // 4. Envoyer l'email via Resend
    // NOTE: Tant que ton domaine n'est pas validé par l'IT, utilise 'onboarding@resend.dev' comme expéditeur.
    // Une fois le domaine validé, tu pourras mettre 'gesta@mairie-angouleme.fr'
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'GESTA <onboarding@resend.dev>', 
      to: ['ton.email@mairie-angouleme.fr'], // ⚠️ REMPLACE CECI PAR TON VRAI EMAIL
      subject: `🚨 Alerte GESTA : ${contrats.length} contrat(s) arrivent à échéance`,
      html: htmlContent,
    });

    if (emailError) throw emailError;

    // 5. (Optionnel) Enregistrer le log dans ta table email_logs
    await supabaseAdmin.from('email_logs').insert({
      destinataires: ['ton.email@mairie-angouleme.fr'], // ⚠️ REMPLACE CECI
      sujet: `Alerte échéance: ${contrats.length} contrat(s)`,
      statut: 'success',
      date_envoi: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      message: `Email envoyé avec succès à ${contrats.length} destinataire(s).`,
      emailId: emailData?.id
    });

  } catch (error: any) {
    console.error('Erreur envoi email:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}