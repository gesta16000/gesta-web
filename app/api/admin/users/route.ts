import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json();
    if (!email || !password) return NextResponse.json({ error: 'Champs requis' }, { status: 400 });

    // 1. Trouver l'utilisateur dans l'authentification (listUsers remplace getUserByEmail)
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === email);
    let userId = existingUser?.id;

    if (!userId) {
      // Créer l'utilisateur
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      userId = data.user.id;
    } else {
      // Mettre à jour le mot de passe s'il existe déjà
      await supabaseAdmin.auth.admin.updateUserById(userId, { password });
    }

    // 2. Upsert dans la table profiles (service_role bypass la RLS)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: userId, email, role: role || 'lecture' }, { onConflict: 'id' });

    if (profileError) return NextResponse.json({ error: 'DB: ' + profileError.message }, { status: 500 });

    return NextResponse.json({ success: true, userId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'ID manquant' }, { status: 400 });

    // 1. Supprimer le profil d'abord (pour éviter les erreurs de clé étrangère)
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // 2. Supprimer l'utilisateur de l'authentification
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}