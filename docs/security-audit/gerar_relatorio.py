#!/usr/bin/env python3
"""
Gera o Relatório de Auditoria de Segurança do Foco Semanal.

Uso (a partir da raiz do repo ou desta pasta):
  docs/security-audit/.venv/bin/python docs/security-audit/gerar_relatorio.py
"""

from __future__ import annotations

import io
import os
from datetime import date
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from reportlab.lib import colors  # noqa: E402
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT  # noqa: E402
from reportlab.lib.pagesizes import A4  # noqa: E402
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet  # noqa: E402
from reportlab.lib.units import cm, mm  # noqa: E402
from reportlab.platypus import (  # noqa: E402
    Flowable,
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parent
OUT_PDF = ROOT / "relatorio-auditoria-seguranca.pdf"
ASSETS = ROOT / "_assets"
PROJECT = "Foco Semanal"
AUDIT_DATE = date.today().strftime("%d/%m/%Y")

SEV_COLORS = {
    "crítica": "#B91C1C",
    "alta": "#EA580C",
    "média": "#D97706",
    "baixa": "#2563EB",
    "informativa": "#64748B",
    "ponto forte": "#059669",
}

# Achados verificados no código (auditoria 29/08/2026)
FINDINGS = [
    {
        "id": "F-01",
        "sev": "alta",
        "cat": "IDOR / privilégio",
        "file": "src/app/api/access/invite/route.ts",
        "lines": "89–129",
        "title": "Convite sobrescreve senha de qualquer conta Auth existente",
        "desc": (
            "Após falha de createUser por e-mail já registrado, a rota usa "
            "admin.updateUserById e define a senha enviada pelo owner. Qualquer "
            "owner autenticado pode assumir a conta de outro usuário (inclusive "
            "outro owner) sem prova de posse do e-mail."
        ),
        "exploit": (
            "Owner chama POST /api/access/invite com e-mail de vítima já em "
            "auth.users e senha escolhida → takeover imediato no projeto."
        ),
        "impact": "Conta takeover dentro do projeto; abuso entre co-owners.",
        "fix": (
            "Não atualizar senha de contas existentes; ou exigir fluxo de reset "
            "por e-mail; bloquear update se o usuário já confirmou login; "
            "nunca sobrescrever senha de role=owner."
        ),
        "accept": [
            "Reconvidar e-mail existente NÃO altera a senha Auth",
            "Ou só cria usuário novo; existente recebe link de reset",
            "Teste: owner A não redefine senha de owner B via /api/access/invite",
        ],
    },
    {
        "id": "F-02",
        "sev": "média",
        "cat": "Permissão no navegador",
        "file": "src/components/AccessManagement.tsx",
        "lines": "103–112",
        "title": "Proteção de owner na revogação existe só na UI",
        "desc": (
            "revoke() retorna cedo se item.role === 'owner', mas a política RLS "
            "access_allowlist_admin permite DELETE/UPDATE a qualquer owner. "
            "Não há regra no banco impedindo apagar/alterar outro owner."
        ),
        "exploit": (
            "Owner malicioso chama PostgREST delete/update em access_allowlist "
            "para remover outro owner ou alterar roles."
        ),
        "impact": "Escalação/remoção de privilégios entre co-owners.",
        "fix": (
            "Policy/trigger: impedir DELETE/UPDATE de linhas com role='owner' "
            "por outro usuário (exceto self-leave consciente, se desejado)."
        ),
        "accept": [
            "DELETE de e-mail com role=owner via API falha para outros owners",
            "UI continua escondendo o botão, mas o backend é a fonte da verdade",
        ],
    },
    {
        "id": "F-03",
        "sev": "média",
        "cat": "Permissão / enumeração",
        "file": "supabase/schema.sql",
        "lines": "123–130, 168",
        "title": "RPC is_email_allowed exposta a anon permite enumerar allowlist",
        "desc": (
            "grant execute … to anon + checkEmailAccess no login distingue "
            "'sem acesso' de 'senha errada', permitindo descobrir quais e-mails "
            "estão na allowlist."
        ),
        "exploit": (
            "Com a anon key pública, chamar rpc is_email_allowed em massa ou "
            "observar mensagens do LoginScreen."
        ),
        "impact": "Vazamento de quem tem acesso ao sistema (PII / targeting).",
        "fix": (
            "Mensagem genérica no login; rate-limit; remover grant anon ou "
            "exigir prova (CAPTCHA / challenge) antes de revelar allowlist."
        ),
        "accept": [
            "Login não revela se o e-mail está na allowlist",
            "Chamadas anônimas à RPC estão rate-limited ou revogadas",
        ],
    },
    {
        "id": "F-04",
        "sev": "baixa",
        "cat": "Banco / isolamento",
        "file": "supabase/schema.sql",
        "lines": "92–98",
        "title": "FK sticky_notes.column_id sem garantir mesmo user_id",
        "desc": (
            "column_id referencia note_columns(id) sem check de que "
            "note_columns.user_id = sticky_notes.user_id. RLS impede leitura "
            "cruzada, mas permite referência órfã/cruzada na escrita."
        ),
        "exploit": (
            "Usuário allowlisted insere sticky com column_id de outro usuário "
            "(se souber o UUID). Não lê dados alheios; risco de integridade."
        ),
        "impact": "Integridade referencial entre tenants; não é IDOR de leitura.",
        "fix": "Trigger/check ou composite FK garantindo mesmo user_id.",
        "accept": [
            "INSERT sticky com column_id de outro user_id é rejeitado",
        ],
    },
    {
        "id": "F-05",
        "sev": "baixa",
        "cat": "Banco / abuso",
        "file": "supabase/schema.sql",
        "lines": "151–169",
        "title": "request_demo_access gravável por anon sem rate limit",
        "desc": (
            "SECURITY DEFINER insert em access_requests concedida a anon. "
            "UI atual usa WhatsApp, mas a RPC permanece aberta a spam."
        ),
        "exploit": "Chamadas anônimas repetidas enchem access_requests.",
        "impact": "Spam operacional para owners; DoS leve na tabela.",
        "fix": "Revogar grant anon se não usado; ou rate-limit / CAPTCHA.",
        "accept": [
            "Anon não consegue floodar access_requests sem limite",
        ],
    },
    {
        "id": "F-06",
        "sev": "baixa",
        "cat": "Banco / defense-in-depth",
        "file": "supabase/schema.sql",
        "lines": "205–208",
        "title": "handle_new_user com search_path = public",
        "desc": (
            "Outras funções de acesso usam search_path = ''. O trigger de "
            "signup ainda usa public — padrão clássico de hijack se um "
            "atacante puder criar objetos em public (improvável no Supabase padrão)."
        ),
        "exploit": "Condicional a privilégio de criar objetos em public.",
        "impact": "Baixo no setup típico Supabase; defesa em profundidade.",
        "fix": "set search_path = '' e qualificar public.profiles etc.",
        "accept": [
            "Função handle_new_user declara search_path vazio ou fixo seguro",
        ],
    },
    {
        "id": "F-07",
        "sev": "baixa",
        "cat": "Chaves / PII",
        "file": "supabase/schema.sql",
        "lines": "173–175",
        "title": "E-mail do owner hardcoded no schema/migrations",
        "desc": (
            "insert … values ('davicoruda@gmail.com', 'owner'). Não é segredo "
            "criptográfico, mas expõe PII se o repositório for público."
        ),
        "exploit": "Leitura do repo → targeting.",
        "impact": "Privacidade / superfície de engenharia social.",
        "fix": "Seed via variável de ambiente / SQL manual pós-deploy.",
        "accept": [
            "Schema versionado não contém e-mail pessoal real",
        ],
    },
    {
        "id": "F-08",
        "sev": "baixa",
        "cat": "Auth política",
        "file": "src/app/api/access/invite/route.ts",
        "lines": "12–14",
        "title": "Política de senha mínima fraca (6 caracteres)",
        "desc": "validPassword exige apenas length >= 6; espelhado no login.",
        "exploit": "Senhas curtas/previsíveis em convites e contas.",
        "impact": "Facilita credential stuffing / adivinhação.",
        "fix": "Mínimo 10–12; opcional complexidade; alinhar Auth Supabase.",
        "accept": [
            "API e UI rejeitam senhas abaixo do novo mínimo",
        ],
    },
    {
        "id": "F-09",
        "sev": "baixa",
        "cat": "Headers",
        "file": "next.config.ts",
        "lines": "3–5",
        "title": "Sem headers de segurança na configuração Next",
        "desc": (
            "nextConfig vazio: sem CSP, X-Frame-Options, Referrer-Policy etc. "
            "no app (podem existir no provedor de hosting)."
        ),
        "exploit": "Depende de config da edge; baseline do app não reforça.",
        "impact": "Clickjacking / XSS mitigation reduzida se hosting não cobrir.",
        "fix": "Definir headers em next.config ou no painel Vercel.",
        "accept": [
            "Resposta HTTP inclui ao menos frame-ancestors/CSP básica",
        ],
    },
]

STRENGTHS = [
    {
        "title": "RLS em todas as tabelas de dados",
        "evidence": "supabase/schema.sql:178–200 — auth.uid() = user_id + current_user_has_access()",
    },
    {
        "title": "Allowlist admin só para owners",
        "evidence": "supabase/schema.sql:201–202 — current_user_is_access_admin()",
    },
    {
        "title": "RPCs de acesso com security definer e search_path vazio",
        "evidence": "supabase/schema.sql:123–149",
    },
    {
        "title": "Rota de convite revalida admin no servidor",
        "evidence": "src/app/api/access/invite/route.ts:37–48",
    },
    {
        "title": "Service role isolada (server-only)",
        "evidence": "src/lib/supabase/admin.ts:1 + src/lib/env.ts",
    },
    {
        "title": "Sem segredos hardcoded / .env no git",
        "evidence": ".env.example placeholders; .gitignore .env*; histórico sem .env commitado",
    },
    {
        "title": "Sem XSS verificado",
        "evidence": "dangerouslySetInnerHTML só com THEME_INIT_SCRIPT estático; notas via texto / plainTextFromHtml",
    },
    {
        "title": "Open redirect mitigado",
        "evidence": "src/lib/safe-path.ts usado em auth/callback e proxy",
    },
    {
        "title": "Sync nuvem sob RLS",
        "evidence": "src/lib/supabase/sync.ts — deletes/inserts com user_id + policies auth.uid()",
    },
]

# Issues agrupadas para GitHub
ISSUES = [
    {
        "n": 1,
        "title": "[Segurança] Convite redefine senha de contas Auth existentes",
        "labels": "security, alta",
        "findings": ["F-01"],
    },
    {
        "n": 2,
        "title": "[Segurança] Owner rows da allowlist protegidos só na UI",
        "labels": "security, média",
        "findings": ["F-02"],
    },
    {
        "n": 3,
        "title": "[Segurança] Enumeração de e-mails da allowlist via RPC anon",
        "labels": "security, média",
        "findings": ["F-03"],
    },
    {
        "n": 4,
        "title": "[Segurança] Endurecimento SQL: FK sticky, RPC demo, search_path",
        "labels": "security, baixa",
        "findings": ["F-04", "F-05", "F-06"],
    },
    {
        "n": 5,
        "title": "[Segurança] Remover e-mail pessoal do seed versionado",
        "labels": "security, baixa",
        "findings": ["F-07"],
    },
    {
        "n": 6,
        "title": "[Segurança] Política de senha e headers HTTP de baseline",
        "labels": "security, baixa",
        "findings": ["F-08", "F-09"],
    },
]


def by_id(fid: str):
    return next(f for f in FINDINGS if f["id"] == fid)


def sev_counts():
    counts = {"crítica": 0, "alta": 0, "média": 0, "baixa": 0, "informativa": 0}
    for f in FINDINGS:
        counts[f["sev"]] = counts.get(f["sev"], 0) + 1
    return counts


def cat_counts():
    d: dict[str, int] = {}
    for f in FINDINGS:
        d[f["cat"]] = d.get(f["cat"], 0) + 1
    return d


def make_charts():
    ASSETS.mkdir(parents=True, exist_ok=True)
    sc = sev_counts()
    labels = [k for k, v in sc.items() if v > 0]
    sizes = [sc[k] for k in labels]
    cols = [SEV_COLORS[k] for k in labels]

    fig, ax = plt.subplots(figsize=(4.2, 4.2), dpi=140)
    wedges, _ = ax.pie(
        sizes,
        colors=cols,
        startangle=90,
        wedgeprops=dict(width=0.42, edgecolor="white", linewidth=2),
    )
    ax.legend(
        wedges,
        [f"{l.capitalize()} ({sc[l]})" for l in labels],
        loc="center",
        frameon=False,
        fontsize=9,
    )
    ax.set_title("Achados por severidade", fontsize=11, pad=12)
    donut = ASSETS / "donut_severity.png"
    fig.tight_layout()
    fig.savefig(donut, bbox_inches="tight", facecolor="white")
    plt.close(fig)

    cc = cat_counts()
    cats = list(cc.keys())
    vals = [cc[c] for c in cats]
    fig, ax = plt.subplots(figsize=(5.2, 3.4), dpi=140)
    bars = ax.barh(cats, vals, color="#0F766E", height=0.55)
    ax.bar_label(bars, padding=4, fontsize=9)
    ax.set_xlabel("Quantidade")
    ax.set_title("Achados por categoria", fontsize=11)
    ax.set_xlim(0, max(vals) + 1.5)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    bar = ASSETS / "bars_category.png"
    fig.tight_layout()
    fig.savefig(bar, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return donut, bar


class SeverityChip(Flowable):
    def __init__(self, label: str, width=22 * mm, height=6.5 * mm):
        super().__init__()
        self.label = label
        self.width = width
        self.height = height
        self.fill = colors.HexColor(SEV_COLORS.get(label, "#64748B"))

    def draw(self):
        self.canv.setFillColor(self.fill)
        self.canv.roundRect(0, 0, self.width, self.height, 3, fill=1, stroke=0)
        self.canv.setFillColor(colors.white)
        self.canv.setFont("Helvetica-Bold", 7)
        text = self.label.upper()
        tw = self.canv.stringWidth(text, "Helvetica-Bold", 7)
        self.canv.drawString((self.width - tw) / 2, 2, text)


def build_styles():
    base = getSampleStyleSheet()
    styles = {
        "cover_title": ParagraphStyle(
            "cover_title",
            parent=base["Title"],
            fontSize=22,
            leading=28,
            textColor=colors.HexColor("#0F172A"),
            alignment=TA_CENTER,
            spaceAfter=12,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontSize=16,
            textColor=colors.HexColor("#0F172A"),
            spaceBefore=10,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontSize=12,
            textColor=colors.HexColor("#134E4A"),
            spaceBefore=8,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["BodyText"],
            fontSize=9.5,
            leading=13,
            alignment=TA_JUSTIFY,
            textColor=colors.HexColor("#1E293B"),
        ),
        "small": ParagraphStyle(
            "small",
            parent=base["BodyText"],
            fontSize=8.5,
            leading=11.5,
            textColor=colors.HexColor("#334155"),
        ),
        "meta": ParagraphStyle(
            "meta",
            parent=base["Normal"],
            fontSize=10,
            leading=14,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#475569"),
        ),
        "code": ParagraphStyle(
            "code",
            parent=base["Code"],
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor("#0F172A"),
            backColor=colors.HexColor("#F1F5F9"),
        ),
        "issue": ParagraphStyle(
            "issue",
            parent=base["Code"],
            fontName="Courier",
            fontSize=7,
            leading=9.5,
            textColor=colors.HexColor("#111827"),
        ),
        "cell": ParagraphStyle(
            "cell",
            parent=base["BodyText"],
            fontSize=8,
            leading=10.5,
            textColor=colors.HexColor("#1E293B"),
        ),
    }
    return styles


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
    canvas.setLineWidth(0.4)
    canvas.line(2 * cm, A4[1] - 1.4 * cm, A4[0] - 2 * cm, A4[1] - 1.4 * cm)
    canvas.line(2 * cm, 1.4 * cm, A4[0] - 2 * cm, 1.4 * cm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.drawString(2 * cm, A4[1] - 1.15 * cm, f"Auditoria de Segurança — {PROJECT}")
    canvas.drawRightString(A4[0] - 2 * cm, A4[1] - 1.15 * cm, AUDIT_DATE)
    canvas.drawCentredString(A4[0] / 2, 0.85 * cm, f"Página {doc.page}")
    canvas.restoreState()


def finding_table(styles):
    header = [
        Paragraph("<b>Sev.</b>", styles["cell"]),
        Paragraph("<b>Arquivo:linha</b>", styles["cell"]),
        Paragraph("<b>Descrição</b>", styles["cell"]),
    ]
    data = [header]
    for f in FINDINGS:
        chip = SeverityChip(f["sev"])
        loc = Paragraph(f"{f['file']}:{f['lines']}", styles["cell"])
        desc = Paragraph(f"<b>{f['id']}</b> — {f['title']}<br/>{f['desc']}", styles["cell"])
        data.append([chip, loc, desc])

    t = Table(data, colWidths=[2.4 * cm, 5.2 * cm, 9.4 * cm], repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ]
        )
    )
    return t


def issue_markdown(issue) -> str:
    parts = []
    findings = [by_id(fid) for fid in issue["findings"]]
    parts.append(f"## {issue['title']}")
    parts.append("")
    parts.append(f"**Labels sugeridas:** `{issue['labels']}`")
    parts.append("")
    parts.append("### Problema")
    for f in findings:
        parts.append(f"- **{f['id']} ({f['sev']}):** {f['desc']}")
    parts.append("")
    parts.append("### Por que é explorável")
    for f in findings:
        parts.append(f"- {f['exploit']}")
    parts.append("")
    parts.append("### Evidência")
    for f in findings:
        parts.append(f"- `{f['file']}:{f['lines']}` — {f['title']}")
    parts.append("")
    parts.append("### Impacto")
    for f in findings:
        parts.append(f"- {f['impact']}")
    parts.append("")
    parts.append("### Sugestão de correção")
    for f in findings:
        parts.append(f"- {f['fix']}")
    parts.append("")
    parts.append("### Critérios de aceite")
    for f in findings:
        for a in f["accept"]:
            parts.append(f"- [ ] {a}")
    return "\n".join(parts)


def build_pdf():
    donut, bar = make_charts()
    styles = build_styles()
    story = []

    # Capa
    story.append(Spacer(1, 3.2 * cm))
    story.append(Paragraph(f"Relatório de Auditoria de Segurança — {PROJECT}", styles["cover_title"]))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph(f"Data: {AUDIT_DATE}", styles["meta"]))
    story.append(Paragraph("Escopo: repositório completo (código + SQL Supabase + rotas API)", styles["meta"]))
    story.append(Spacer(1, 0.8 * cm))
    story.append(Paragraph("<b>Stack detectada</b>", styles["h2"]))
    story.append(
        Paragraph(
            "TypeScript · Next.js 16 (App Router) · React 19 · Supabase Auth + Postgres "
            "(cliente @supabase/supabase-js / SSR) · Tailwind 4 · deploy documentado em Vercel "
            "(sem Docker/CI/Helm/Terraform no repo).",
            styles["body"],
        )
    )
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("<b>Nota metodológica (mapeamento das categorias)</b>", styles["h2"]))
    story.append(
        Paragraph(
            "1) <b>Banco sem tranca</b> → RLS Supabase + filtro user_id no sync. "
            "2) <b>Permissão no navegador</b> → gates isAdmin/role no React cruzados com RPC/API. "
            "3) <b>IDOR</b> → inventário de handlers (api/access/invite, auth/callback) + mutações PostgREST. "
            "4) <b>Chaves expostas</b> → código, .env.example, docs, histórico git. "
            "5) <b>XSS</b> → dangerouslySetInnerHTML, note-html, renderização de lembretes. "
            "Somente achados verificados no código; ausências também registradas.",
            styles["body"],
        )
    )
    story.append(PageBreak())

    # Resumo executivo
    story.append(Paragraph("1. Resumo executivo", styles["h1"]))
    sc = sev_counts()
    story.append(
        Paragraph(
            f"Total de achados acionáveis: <b>{len(FINDINGS)}</b> — "
            f"crítica {sc['crítica']}, alta {sc['alta']}, média {sc['média']}, "
            f"baixa {sc['baixa']}, informativa {sc['informativa']}. "
            "Nenhum vazamento cross-tenant sob RLS foi confirmado. "
            "Principal risco: takeover via sobrescrita de senha no convite.",
            styles["body"],
        )
    )
    story.append(Spacer(1, 0.4 * cm))
    img_row = Table(
        [[Image(str(donut), width=7.2 * cm, height=7.2 * cm), Image(str(bar), width=9 * cm, height=5.8 * cm)]],
        colWidths=[8 * cm, 9 * cm],
    )
    img_row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    story.append(img_row)
    story.append(Spacer(1, 0.5 * cm))

    story.append(Paragraph("2. Pontos fortes", styles["h1"]))
    for s in STRENGTHS:
        story.append(
            Paragraph(
                f"• <font color='#059669'><b>✓</b></font> <b>{s['title']}</b><br/>"
                f"<font size='8' color='#64748B'>{s['evidence']}</font>",
                styles["small"],
            )
        )
        story.append(Spacer(1, 0.12 * cm))

    story.append(Paragraph("Pontos fracos (riscos centrais)", styles["h2"]))
    story.append(
        Paragraph(
            "• Owner pode redefinir senha de qualquer Auth user via convite (alta).<br/>"
            "• Remoção/alteração de owners da allowlist não está travada no banco (média).<br/>"
            "• Enumeração da allowlist por anon + UX de login (média).",
            styles["body"],
        )
    )
    story.append(PageBreak())

    story.append(Paragraph("3. Achados detalhados por categoria", styles["h1"]))
    story.append(finding_table(styles))
    story.append(Spacer(1, 0.4 * cm))

    story.append(Paragraph("Detalhamento arquivo a arquivo", styles["h2"]))
    for f in FINDINGS:
        block = [
            Paragraph(
                f"<b>{f['id']}</b>  [{f['sev'].upper()}]  ·  {f['cat']}",
                styles["small"],
            ),
            Paragraph(f"<b>{f['title']}</b>", styles["body"]),
            Paragraph(f"<b>Local:</b> {f['file']}:{f['lines']}", styles["small"]),
            Paragraph(f"<b>Por que é explorável:</b> {f['exploit']}", styles["small"]),
            Paragraph(f"<b>Impacto:</b> {f['impact']}", styles["small"]),
            Spacer(1, 0.25 * cm),
        ]
        story.append(KeepTogether(block))

    # Categorias sem achado
    story.append(Paragraph("Categorias sem achado explorável", styles["h2"]))
    story.append(
        Paragraph(
            "• <b>XSS:</b> nenhum sink com input de usuário; "
            "<font face='Courier' size='8'>noteHtmlFromStored</font> não está ligado a "
            "dangerouslySetInnerHTML; lembretes usam texto puro.<br/>"
            "• <b>Chaves hardcoded:</b> nenhum segredo de produção no código; "
            "service_role só no servidor; defaults ${VAR:-secret} ausentes.",
            styles["body"],
        )
    )
    story.append(PageBreak())

    story.append(Paragraph("4. Recomendações priorizadas", styles["h1"]))
    recs = [
        ("P1", "Corrigir sobrescrita de senha em /api/access/invite (F-01)."),
        ("P2", "Travar DELETE/UPDATE de owners na allowlist no Postgres (F-02)."),
        ("P3", "Eliminar enumeração de e-mails (mensagem genérica + restringir RPC) (F-03)."),
        ("P4", "Endurecimento SQL: FK sticky, RPC demo, search_path do trigger (F-04–F-06)."),
        ("P5", "Remover e-mail pessoal do seed; reforçar senha e headers (F-07–F-09)."),
    ]
    for code, text in recs:
        story.append(Paragraph(f"<b>{code}</b> — {text}", styles["body"]))
        story.append(Spacer(1, 0.15 * cm))

    story.append(PageBreak())
    story.append(Paragraph("5. Issues para o GitHub", styles["h1"]))
    story.append(
        Paragraph(
            "Copie cada bloco abaixo para criar uma issue. Achados relacionados foram agrupados.",
            styles["body"],
        )
    )
    story.append(Spacer(1, 0.3 * cm))

    for issue in ISSUES:
        md = issue_markdown(issue)
        header = f"--- ISSUE {issue['n']} ---"
        footer = f"--- FIM ISSUE {issue['n']} ---"
        story.append(Paragraph(f"<b>{header}</b>", styles["small"]))
        # Preformatted wraps poorly for long lines; use Paragraph with <br/> and escape
        escaped = (
            md.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\n", "<br/>")
        )
        story.append(Paragraph(escaped, styles["issue"]))
        story.append(Paragraph(f"<b>{footer}</b>", styles["small"]))
        story.append(Spacer(1, 0.45 * cm))

    doc = SimpleDocTemplate(
        str(OUT_PDF),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=f"Auditoria de Segurança — {PROJECT}",
        author="Auditoria automatizada Foco Semanal",
    )
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    return OUT_PDF


def verify_pdf(path: Path):
    """Rasteriza páginas com pypdfium2 se disponível; senão conta páginas via pypdf/reportlab."""
    try:
        import pypdfium2 as pdfium  # type: ignore

        pdf = pdfium.PdfDocument(str(path))
        n = len(pdf)
        preview_dir = ASSETS / "preview"
        preview_dir.mkdir(parents=True, exist_ok=True)
        for i in range(n):
            page = pdf[i]
            bitmap = page.render(scale=1.2)
            pil = bitmap.to_pil()
            out = preview_dir / f"page-{i + 1:02d}.png"
            pil.save(out)
        return n, preview_dir
    except Exception:
        pass
    try:
        from pypdf import PdfReader  # type: ignore

        n = len(PdfReader(str(path)).pages)
        return n, None
    except Exception:
        # Fallback: file size only
        return None, None


if __name__ == "__main__":
    pdf_path = build_pdf()
    pages, preview = verify_pdf(pdf_path)
    print(f"PDF: {pdf_path}")
    print(f"Tamanho: {pdf_path.stat().st_size} bytes")
    if pages is not None:
        print(f"Páginas: {pages}")
    if preview:
        print(f"Previews: {preview}")
