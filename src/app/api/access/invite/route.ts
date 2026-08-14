import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function validEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  const { data: isAdmin, error: roleError } = await supabase.rpc(
    "current_user_is_access_admin",
  );
  if (roleError || !isAdmin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
  } | null;
  if (!validEmail(body?.email)) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }
  const email = body.email.trim().toLowerCase();

  const { error: allowError } = await supabase.from("access_allowlist").upsert(
    {
      email,
      added_by: authData.user.id,
    },
    { onConflict: "email" },
  );
  if (allowError) {
    return NextResponse.json(
      { error: "Não foi possível liberar o e-mail." },
      { status: 500 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({
      ok: true,
      invited: false,
      message:
        "E-mail liberado. Configure SUPABASE_SERVICE_ROLE_KEY na Vercel para enviar convites automaticamente.",
    });
  }

  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/auth/callback?next=/redefinir-senha`;
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    { redirectTo },
  );

  if (!inviteError) {
    await supabase.from("access_requests").delete().eq("email", email);
    return NextResponse.json({
      ok: true,
      invited: true,
      message: "Acesso liberado e convite enviado.",
    });
  }

  // Se a conta já existe, envia recuperação para definir/trocar a senha.
  const { error: resetError } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (!resetError) {
    await supabase.from("access_requests").delete().eq("email", email);
    return NextResponse.json({
      ok: true,
      invited: true,
      message: "Acesso liberado e link para definir a senha enviado.",
    });
  }

  return NextResponse.json({
    ok: true,
    invited: false,
    message:
      "E-mail liberado, mas o convite não pôde ser enviado. A pessoa pode usar “Primeiro acesso” na tela de login.",
  });
}
