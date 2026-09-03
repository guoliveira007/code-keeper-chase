CREATE TABLE public.lesson_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id text NOT NULL,
  subject text,
  lesson_title text,
  transcript text NOT NULL,
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_summaries TO authenticated;
GRANT ALL ON public.lesson_summaries TO service_role;
ALTER TABLE public.lesson_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lesson summaries" ON public.lesson_summaries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);