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

  const { data: existingAllow, error: existingAllowError } = await supabase
    .from("access_allowlist")
    .select("email, role")
    .eq("email", email)
    .maybeSingle();
  if (existingAllowError) {
    return NextResponse.json(
      { error: "Não foi possível consultar a lista de acesso." },
      { status: 500 },
    );
  }
  if (existingAllow?.role === "owner") {
    return NextResponse.json({
      ok: true,
      invited: false,
      existingOwner: true,
      message: "Este e-mail já é proprietário. Nenhuma alteração foi feita.",
    });
  }

  const admin = createAdminClient();
  if (!admin) {
    console.error("[foco] invite: SUPABASE_SERVICE_ROLE_KEY ausente");
    return NextResponse.json(
      { error: "Não foi possível criar a senha temporária." },
      { status: 500 },
    );
  }

  const existingAuthId = await findAuthUserId(admin, email);

  const { error: allowError } = await supabase.from("access_allowlist").upsert(
    {
      email,
      role: "member",
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

  await supabase.from("access_requests").delete().eq("email", email);

  // Conta Auth já existe: libera acesso, NUNCA redefine senha.
  if (existingAuthId) {
    return NextResponse.json({
      ok: true,
      invited: true,
      existingAccount: true,
      message:
        "E-mail liberado. A conta já existia — a senha NÃO foi alterada. A pessoa entra com a senha atual ou usa “Esqueci a senha” no login.",
    });
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
    if (already) {
      // Corrida rara: conta surgiu entre o listUsers e o createUser.
      // Ainda assim NÃO redefinimos senha.
      return NextResponse.json({
        ok: true,
        invited: true,
        existingAccount: true,
        message:
          "E-mail liberado. A conta já existia — a senha NÃO foi alterada. A pessoa entra com a senha atual ou usa “Esqueci a senha” no login.",
      });
    }
    console.error("[foco] invite createUser:", createError.message);
    return NextResponse.json(
      { error: "Não foi possível criar o usuário." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    invited: true,
    created: true,
    message:
      "Acesso liberado com senha temporária. A pessoa entra com e-mail e essa senha, e pode trocar em Ajustes.",
  });
}
