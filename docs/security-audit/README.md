# Auditoria de Segurança — Foco Semanal

## Arquivos

- `relatorio-auditoria-seguranca.pdf` — relatório gerado
- `gerar_relatorio.py` — regenera o PDF (gráficos + issues)

## Regenerar

```bash
python3 -m venv docs/security-audit/.venv
docs/security-audit/.venv/bin/pip install reportlab matplotlib pillow pypdf pypdfium2
docs/security-audit/.venv/bin/python docs/security-audit/gerar_relatorio.py
```
