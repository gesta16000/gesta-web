import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../../../lib/supabase-server-auth';
import { getErrorMessage } from '../../../../lib/error';
import type { EmailLog } from '../../../../types/admin';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Export des logs d'emails sur une plage de dates (admin uniquement).
// GET /api/admin/export-logs?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = request.nextUrl;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Les paramètres startDate et endDate sont requis' },
        { status: 400 }
      );
    }

    if (!DATE_FORMAT_REGEX.test(startDate) || !DATE_FORMAT_REGEX.test(endDate)) {
      return NextResponse.json(
        { success: false, error: 'Format de date invalide, attendu YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Borne exclusive : on ajoute un jour à endDate pour inclure toute la
    // journée de fin (date_envoi < endDate + 1 jour).
    const endDateExclusive = new Date(`${endDate}T00:00:00.000Z`);
    endDateExclusive.setUTCDate(endDateExclusive.getUTCDate() + 1);
    const endDateExclusiveStr = endDateExclusive.toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('email_logs')
      .select('*')
      .gte('date_envoi', startDate)
      .lt('date_envoi', endDateExclusiveStr)
      .order('date_envoi', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: 'DB: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: (data ?? []) as EmailLog[] });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
