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

/** Redimensiona e comprime o arquivo para data URL (JPEG). */
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
        const size = 96;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas indisponível."));
          return;
        }
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        let quality = 0.82;
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
