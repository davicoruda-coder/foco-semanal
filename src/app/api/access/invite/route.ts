import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function validEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  );
}

function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 6 && value.length <= 72;
}

async function findAuthUserId(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  email: string,
) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) return null;
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email,
    );
    if (match) return match.id;
    if (data.users.length < 200) return null;
    page += 1;
  }
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
    password?: unknown;
  } | null;
  if (!validEmail(body?.email)) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }
  if (!validPassword(body?.password)) {
    return NextResponse.json(
      { error: "A senha temporária precisa ter pelo menos 6 caracteres." },
      { status: 400 },
    );
  }
  const email = body.email.trim().toLowerCase();
  const password = body.password;

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
    console.error("[foco] invite: SUPABASE_SERVICE_ROLE_KEY ausente");
    return NextResponse.json(
      { error: "Não foi possível criar a senha temporária." },
      { status: 500 },
    );
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    const already =
      createError.message.toLowerCase().includes("already") ||
      createError.message.toLowerCase().includes("registered");
    if (!already) {
      console.error("[foco] invite createUser:", createError.message);
      return NextResponse.json(
        { error: "Não foi possível criar o usuário." },
        { status: 500 },
      );
    }

    const userId = await findAuthUserId(admin, email);
    if (!userId) {
      console.error("[foco] invite: conta existente não encontrada", email);
      return NextResponse.json(
        {
          error:
            "E-mail liberado, mas não foi possível atualizar a senha da conta existente.",
        },
        { status: 500 },
      );
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(
      userId,
      { password },
    );
    if (updateError) {
      console.error("[foco] invite updateUser:", updateError.message);
      return NextResponse.json(
        { error: "Não foi possível atualizar a senha." },
        { status: 500 },
      );
    }
  }

  await supabase.from("access_requests").delete().eq("email", email);

  return NextResponse.json({
    ok: true,
    invited: true,
    message:
      "Acesso liberado com senha temporária. A pessoa entra com e-mail e essa senha, e pode trocar em Ajustes.",
  });
}
