import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Endpoint de exclusão definitiva de conta com confirmação obrigatória de senha.
 * Requisito de alta segurança e conformidade com Google Play Store.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user || !authData.user.email) {
      return NextResponse.json(
        { error: "Não autorizado ou sessão expirada." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const password = typeof body.password === "string" ? body.password.trim() : "";

    if (!password) {
      return NextResponse.json(
        { error: "A senha é obrigatória para autorizar a exclusão da conta." },
        { status: 400 },
      );
    }

    // Valida criptograficamente se a senha confere com a conta no Supabase
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authData.user.email,
      password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: "Senha incorreta. A conta não foi excluída por segurança." },
        { status: 403 },
      );
    }

    const userId = authData.user.id;
    const admin = createAdminClient();

    if (!admin) {
      return NextResponse.json(
        { error: "Configuração de administração do servidor não disponível." },
        { status: 500 },
      );
    }

    // Exclui o usuário no Supabase Auth.
    // Todas as tabelas vinculadas (perfis, matérias, sessões, blocos, lembretes) possuem ON DELETE CASCADE.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || "Falha ao excluir conta." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, message: "Conta e dados excluídos com sucesso." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao excluir conta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
