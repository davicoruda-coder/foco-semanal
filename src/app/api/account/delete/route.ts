import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Endpoint de exclusão definitiva de conta.
 * Requisito obrigatório da Google Play Store (Account Deletion Policy).
 * Remove o usuário do Supabase Auth e cascateia a remoção de todos os dados do banco.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Não autorizado ou sessão expirada." },
        { status: 401 },
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
