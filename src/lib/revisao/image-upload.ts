"use client";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export interface CompressedImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Redimensiona e comprime uma imagem no navegador para formato WebP.
 * Reduz arquivos de 3-5MB para ~50-150KB sem perda perceptível de legibilidade para estudo.
 */
export async function compressImage(
  input: File | string,
  maxDimension = 1200,
  quality = 0.84,
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      let { width, height } = img;

      // Calcular escala proporcional se ultrapassar o limite máximo
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Falha ao obter contexto 2D do Canvas."));
        return;
      }

      // Fundo branco para imagens com transparência (ex: PNG com fundo transparente)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Tenta WebP primeiro, com fallback para JPEG
      const mimeType = "image/webp";
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Falha ao comprimir imagem"));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            resolve({
              blob,
              dataUrl,
              width,
              height,
              sizeBytes: blob.size,
            });
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        },
        mimeType,
        quality,
      );
    };

    img.onerror = (err) => {
      reject(new Error("Falha ao carregar arquivo de imagem: " + String(err)));
    };

    if (typeof input === "string") {
      img.src = input;
    } else {
      const url = URL.createObjectURL(input);
      img.src = url;
    }
  });
}

/**
 * Faz upload da imagem para o Supabase Storage no bucket 'flashcard-images'.
 * Se o bucket ainda não tiver sido criado no Supabase, usa o WebP comprimido como fallback
 * para que o usuário não fique impedido de salvar seus estudos.
 */
export async function uploadFlashcardImage(
  input: File | string,
  side: "frente" | "verso",
): Promise<{ url: string; isFallback?: boolean; error?: string }> {
  try {
    const compressed = await compressImage(input);

    if (!isSupabaseConfigured()) {
      return { url: compressed.dataUrl, isFallback: true };
    }

    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      // Usuário não autenticado no Supabase ou offline
      return { url: compressed.dataUrl, isFallback: true };
    }

    const userId = authData.user.id;
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const fileName = `${Date.now()}_${randomSuffix}_${side}.webp`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("flashcard-images")
      .upload(filePath, compressed.blob, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      console.warn(
        `[Flashcard Image Upload] Falha no upload para bucket 'flashcard-images' (${uploadError.message}). Usando fallback comprimido.`,
      );
      // Fallback gracioso com a imagem WebP otimizada
      return {
        url: compressed.dataUrl,
        isFallback: true,
        error: uploadError.message,
      };
    }

    const { data: publicData } = supabase.storage
      .from("flashcard-images")
      .getPublicUrl(filePath);

    return {
      url: publicData.publicUrl,
      isFallback: false,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Flashcard Image Upload] Erro ao processar imagem:", message);
    return { url: "", error: message };
  }
}
