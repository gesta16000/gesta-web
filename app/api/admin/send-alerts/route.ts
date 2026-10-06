import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function POST() {
  try {
    // 1. Vérification des clés
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;

    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY est manquante dans .env.local");
    if (!resendKey) throw new Error("RESEND_API_KEY est manquante dans .env.local");

    const supabaseAdmin = createClient(url!, serviceKey);
    const resend = new Resend(resendKey);

    // 2. Dates
    const today = new Date();
    const in60Days = new Date();
    in60Days.setDate(today.getDate() + 60);
    const todayStr = today.toISOString().split('T')[0];
    const in60DaysStr = in60Days.toISOString().split('T')[0];

    // 3. Récupération des contrats
    const { data: contrats, error: dbError } = await supabaseAdmin
      .from('contrats')
      .select(`id, nom_marche, date_fin, prestataires ( societe )`)
      .gte('date_fin', todayStr)
      .lte('date_fin', in60DaysStr)
      .order('date_fin', { ascending: true });

    if (dbError) throw new Error("Erreur base de données: " + dbError.message);

    if (!contrats || contrats.length === 0) {
      return NextResponse.json({ success: true, message: "Aucun contrat n'arrive à échéance dans les 60 prochains jours." });
    }

    // 4. HTML de l'email
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
        <p>Bonjour, voici la liste des <strong>${contrats.length} contrat(s)</strong> arrivant à échéance dans les 60 prochains jours :</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background-color: #ffffff; border-radius: 8px;">
          <thead style="background-color: #f1f5f9;"><tr>
            <th style="padding: 12px; text-align: left;">Prestataire</th>
            <th style="padding: 12px; text-align: left;">Marché</th>
            <th style="padding: 12px; text-align: left;">Date de fin</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;

    // 5. Envoi de l'email
    const targetEmail = 'gesta16000@gmail.com'; // Ton email de test
    
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: [targetEmail],
      subject: `🚨 Alerte GESTA : ${contrats.length} contrat(s) à échéance`,
      html: htmlContent,
    });

    if (emailError) throw new Error("Erreur Resend: " + emailError.message);

    // 6. Sauvegarde du log (avec try/catch classique pour éviter l'erreur ".catch is not a function")
    try {
      await supabaseAdmin.from('email_logs').insert({
        destinataires: [targetEmail],
        sujet: `Alerte échéance: ${contrats.length} contrat(s)`,
        statut: 'success',
        date_envoi: new Date().toISOString()
      });
    } catch (logError) {
      console.log("⚠️ Log non sauvegardé, mais l'email a bien été envoyé.", logError);
    }

    return NextResponse.json({ 
      success: true, 
      message: `✅ Email envoyé avec succès à ${contrats.length} destinataire(s) !` 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}