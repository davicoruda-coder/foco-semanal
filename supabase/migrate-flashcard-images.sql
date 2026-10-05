-- =============================================================
-- Migration: Suporte a imagens na frente e verso dos Flashcards
-- + Configuração do Bucket no Supabase Storage
-- Executar no Supabase SQL Editor
-- =============================================================

-- 1. Adiciona as colunas para URLs de imagens na frente e verso
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS frente_imagem_url TEXT;
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS verso_imagem_url TEXT;

-- 2. Criação do Bucket de Storage 'flashcard-images' (se a extensão storage estiver ativa)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'flashcard-images',
      'flashcard-images',
      true,
      5242880, -- 5MB máx
      ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/gif']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = true,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/gif'];
  END IF;
END $$;

-- 3. Políticas de Segurança (RLS) para o bucket de imagens
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    -- Leitura pública para visualização dos cards
    DROP POLICY IF EXISTS "flashcard_images_public_read" ON storage.objects;
    CREATE POLICY "flashcard_images_public_read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'flashcard-images');

    -- Upload apenas por usuários autenticados na sua própria pasta (userId/...)
    DROP POLICY IF EXISTS "flashcard_images_user_insert" ON storage.objects;
    CREATE POLICY "flashcard_images_user_insert"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'flashcard-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    -- Atualização/Sobrescrita pelo próprio usuário
    DROP POLICY IF EXISTS "flashcard_images_user_update" ON storage.objects;
    CREATE POLICY "flashcard_images_user_update"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'flashcard-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    -- Exclusão pelo próprio usuário
    DROP POLICY IF EXISTS "flashcard_images_user_delete" ON storage.objects;
    CREATE POLICY "flashcard_images_user_delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'flashcard-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
