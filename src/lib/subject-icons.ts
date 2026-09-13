import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Brain,
  Briefcase,
  Code2,
  Database,
  FileQuestion,
  FlaskConical,
  Globe,
  GraduationCap,
  Languages,
  Lightbulb,
  ListChecks,
  Music,
  PenLine,
  Sigma,
  Terminal,
} from "lucide-react";

export type SubjectIconPreset = {
  id: string;
  label: string;
  Icon: LucideIcon;
};

/** Pack pronto — escolhido no cadastro da matéria. */
export const SUBJECT_ICON_PRESETS: SubjectIconPreset[] = [
  { id: "book", label: "Livro", Icon: BookOpen },
  { id: "code", label: "Código", Icon: Code2 },
  { id: "terminal", label: "Terminal", Icon: Terminal },
  { id: "database", label: "Banco", Icon: Database },
  { id: "languages", label: "Idiomas", Icon: Languages },
  { id: "globe", label: "Mundo", Icon: Globe },
  { id: "brain", label: "Raciocínio", Icon: Brain },
  { id: "sigma", label: "Matemática", Icon: Sigma },
  { id: "pen", label: "Escrita", Icon: PenLine },
  { id: "questions", label: "Questões", Icon: FileQuestion },
  { id: "checks", label: "Checklist", Icon: ListChecks },
  { id: "grad", label: "Faculdade", Icon: GraduationCap },
  { id: "flask", label: "Ciência", Icon: FlaskConical },
  { id: "briefcase", label: "Trabalho", Icon: Briefcase },
  { id: "music", label: "Música", Icon: Music },
  { id: "idea", label: "Ideia", Icon: Lightbulb },
];

const PRESET_IDS = new Set(SUBJECT_ICON_PRESETS.map((p) => p.id));
const PRESET_PREFIX = "preset:";
const MAX_UPLOAD_CHARS = 120_000; // ~90 KB data URL

export function presetIconValue(id: string): string {
  return `${PRESET_PREFIX}${id}`;
}

export function parseSubjectIcon(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v) return null;
  if (v.startsWith(PRESET_PREFIX)) {
    const id = v.slice(PRESET_PREFIX.length);
    return PRESET_IDS.has(id) ? v : null;
  }
  if (v.startsWith("data:image/") && v.length <= MAX_UPLOAD_CHARS) return v;
  return null;
}

export function subjectIconPresetId(icon: string | null | undefined): string | null {
  if (!icon?.startsWith(PRESET_PREFIX)) return null;
  const id = icon.slice(PRESET_PREFIX.length);
  return PRESET_IDS.has(id) ? id : null;
}

export function isSubjectIconUpload(icon: string | null | undefined): boolean {
  return Boolean(icon?.startsWith("data:image/"));
}

/** Sugestão só de exibição (não grava) a partir do nome da matéria. */
const NAME_ICON_HINTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/python|programa|c[oó]digo|codigo|javascript|typescript|\bjava\b|\bdev\b/i, "code"],
  [/terminal|linux|shell|\bgit\b/i, "terminal"],
  [/banco|sql|dados|database|postgres/i, "database"],
  [/ingl[eê]s|english|espanhol|franc[eê]s|idioma/i, "languages"],
  [/mundo|geograf|atualidades/i, "globe"],
  [/rlm|racioc[ií]nio|l[oó]gica/i, "brain"],
  [/matem|c[aá]lculo|estat[ií]st|\bsigma\b/i, "sigma"],
  [/reda[cç]|escrita|portugu/i, "pen"],
  [/quest[aã]o|questões|questoes/i, "questions"],
  [/checklist|lista|tarefas/i, "checks"],
  [/faculdade|univers|gradua|aula/i, "grad"],
  [/ci[eê]ncia|f[ií]sica|qu[ií]mica|biolog/i, "flask"],
  [/projeto|trabalho|carreira/i, "briefcase"],
  [/m[uú]sica|music/i, "music"],
  [/revis[aã]o|resumo|leitura|livro/i, "book"],
  [/livre|pausa|ideia/i, "idea"],
];

export function guessSubjectIconPresetId(name: string): string | null {
  const n = name.trim();
  if (!n) return null;
  for (const [re, id] of NAME_ICON_HINTS) {
    if (re.test(n) && PRESET_IDS.has(id)) return id;
  }
  return null;
}

/** Fundo neutro claro — combina com o tile do app (claro e escuro). */
export const SUBJECT_ICON_UPLOAD_BG = "#F4F3F8";

/** Fração do tile para a imagem enviada.
 *  > 1 corta a margem vazia da arte gerada (overflow no tile). */
export const SUBJECT_ICON_GLYPH_RATIO = 1.16;

/** No upload: quase preenche o canvas (a margem vem da arte). */
const SUBJECT_ICON_UPLOAD_FILL = 0.98;

/** Redimensiona, centraliza e comprime para data URL (JPEG). */
export function fileToSubjectIconDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Escolha uma imagem PNG, JPG ou WebP."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagem inválida."));
      img.onload = () => {
        const size = 128;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas indisponível."));
          return;
        }
        ctx.fillStyle = SUBJECT_ICON_UPLOAD_BG;
        ctx.fillRect(0, 0, size, size);

        const pad = size * ((1 - SUBJECT_ICON_UPLOAD_FILL) / 2);
        const box = size - pad * 2;
        const scale = Math.min(box / img.width, box / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        const dx = (size - dw) / 2;
        const dy = (size - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);

        let quality = 0.88;
        let data = canvas.toDataURL("image/jpeg", quality);
        while (data.length > MAX_UPLOAD_CHARS && quality > 0.4) {
          quality -= 0.1;
          data = canvas.toDataURL("image/jpeg", quality);
        }
        if (data.length > MAX_UPLOAD_CHARS) {
          reject(new Error("Imagem grande demais. Tente outra menor."));
          return;
        }
        resolve(data);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
