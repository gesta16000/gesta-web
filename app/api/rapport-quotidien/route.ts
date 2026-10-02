import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Initialisation de Resend et Supabase
const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const today = new Date();
    const in60Days = new Date();
    in60Days.setDate(today.getDate() + 60);

    // Récupérer les contrats qui se terminent dans les 60 prochains jours
    const { data: contrats, error } = await supabase
      .from('contrats')
      .select(`
        *,
        prestataires ( societe, email )
      `)
      .gte('date_fin', today.toISOString().split('T')[0])
      .lte('date_fin', in60Days.toISOString().split('T')[0])
      .order('date_fin', { ascending: true });

    if (error) {
      // Log de l'erreur
      await supabase.from('email_logs').insert({
        destinataires: ['gesta16000@gmail.com'],
        statut: 'error',
        message: 'Erreur base de données : ' + error.message,
        type_envoi: 'automatique'
      });

      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!contrats || contrats.length === 0) {
      return NextResponse.json({ message: 'Aucune échéance dans les 60 prochains jours.' });
    }

    // Construire le contenu de l'email
    const todayStr = today.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #f8fafc; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">🛡️ GESTA - Rapport Quotidien</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px;">${todayStr}</p>
        </div>
        
        <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">⚠️ ${contrats.length} contrat(s) arrivant à échéance</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Marché</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Prestataire</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Échéance</th>
                <th style="padding: 10px 12px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase;">Jours restants</th>
              </tr>
            </thead>
            <tbody>
    `;

    contrats.forEach(contrat => {
      const dateFin = new Date(contrat.date_fin);
      const diffDays = Math.ceil((dateFin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const urgencyColor = diffDays <= 15 ? '#ef4444' : diffDays <= 30 ? '#f59e0b' : '#22c55e';
      const urgencyBg = diffDays <= 15 ? '#fef2f2' : diffDays <= 30 ? '#fffbeb' : '#f0fdf4';

      htmlContent += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; font-weight: 600; color: #1e293b;">${contrat.nom_marche}</td>
          <td style="padding: 12px; color: #475569;">${contrat.prestataires?.societe || 'N/A'}</td>
          <td style="padding: 12px; color: #475569;">${dateFin.toLocaleDateString('fr-FR')}</td>
          <td style="padding: 12px; text-align: center;">
            <span style="background: ${urgencyBg}; color: ${urgencyColor}; padding: 4px 10px; border-radius: 20px; font-weight: 700; font-size: 13px;">
              ${diffDays}j
            </span>
          </td>
        </tr>
      `;
    });

    htmlContent += `
            </tbody>
          </table>
          
          <div style="margin-top: 24px; padding: 16px; background: #f1f5f9; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #64748b; font-size: 13px;">
              💡 Connectez-vous à <strong>GESTA</strong> pour consulter les détails et prendre les actions nécessaires.
            </p>
          </div>
        </div>
        
        <p style="text-align: center; color: #94a3b8; font-size: 11px; margin-top: 16px;">
          Email automatique envoyé par GESTA • Gestion des Contrats & Marchés
        </p>
      </div>
    `;

        // Récupérer les destinataires configurés dans la base de données
    const { data: configData } = await supabase.from('email_config').select('destinataires').single();
    const destinataires = configData?.destinataires && configData.destinataires.length > 0 
      ? configData.destinataires 
      : ['gesta16000@gmail.com']; // Fallback de sécurité

    // Envoyer l'email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'GESTA <onboarding@resend.dev>',
      to: destinataires,
      subject: `🛡️ GESTA - ${contrats.length} contrat(s) à échéance dans les 60 jours`,
      html: htmlContent,
    });

    // Enregistrer le log dans la base de données
    if (emailError) {
      await supabase.from('email_logs').insert({
        destinataires: destinataires,
        statut: 'error',
        message: 'Erreur Resend : ' + emailError.message,
        type_envoi: 'automatique'
      });

      return NextResponse.json({ success: false, error: emailError.message }, { status: 500 });
    }

    // Succès : enregistrer le log
    await supabase.from('email_logs').insert({
      destinataires: destinataires,
      statut: 'success',
      message: `${contrats.length} contrat(s) signalé(s) - Email ID: ${emailData?.id}`,
      type_envoi: 'automatique'
    });

    return NextResponse.json({
      success: true,
      results: [{ contrat: contrats.length + ' échéance(s)', status: 'success' }]
    });

  } catch (err: any) {
    // Log de l'erreur inattendue
    await supabase.from('email_logs').insert({
      destinataires: ['gesta16000@gmail.com'],
      statut: 'error',
      message: 'Erreur inattendue : ' + err.message,
      type_envoi: 'automatique'
    });

    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}