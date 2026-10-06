import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn } from "lucide-react";

interface FlashcardImageLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

/**
 * Modal Lightbox para expandir imagens de flashcards em alta resolução.
 * Ideal para ler pequenos detalhes de enunciados, tabelas, gráficos e resoluções.
 */
export function FlashcardImageLightbox({
  src,
  alt = "Imagem ampliada",
  onClose,
}: FlashcardImageLightboxProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!src) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [src, onClose]);

  if (!src || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92vh] max-w-[95vw] sm:max-w-4xl overflow-hidden rounded-xl border border-white/20 bg-neutral-950/90 shadow-2xl flex flex-col m-auto"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-neutral-900/60">
          <span className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
            <ZoomIn size={14} className="text-[var(--signal)]" /> Visualização Ampliada
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-neutral-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-center p-3 sm:p-5 overflow-auto max-h-[calc(92vh-50px)]">
          <img
            src={src}
            alt={alt}
            className="max-h-[82vh] w-auto max-w-full rounded-lg object-contain select-none"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
