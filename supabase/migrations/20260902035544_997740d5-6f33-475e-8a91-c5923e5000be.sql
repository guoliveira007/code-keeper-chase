CREATE UNIQUE INDEX subjects_unique_name_per_parent ON public.subjects (user_id, name, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  exam_date date NOT NULL DEFAULT CURRENT_DATE,
  board text,
  total_questions integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'corrigido',
  exam_file_path text,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exams" ON public.exams FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  number integer NOT NULL,
  subject text,
  topic text,
  statement text,
  options jsonb,
  correct_answer text,
  user_answer text,
  is_correct boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX exam_questions_exam_id_idx ON public.exam_questions(exam_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_questions TO authenticated;
GRANT ALL ON public.exam_questions TO service_role;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exam questions" ON public.exam_questions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.error_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid NOT NULL UNIQUE REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  user_explanation text NOT NULL,
  why_wrong text,
  correct_reasoning text,
  error_type text,
  concept text,
  visual_svg text,
  visual_caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.error_reviews TO authenticated;
GRANT ALL ON public.error_reviews TO service_role;
ALTER TABLE public.error_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own error reviews" ON public.error_reviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plans TO authenticated;
GRANT ALL ON public.study_plans TO service_role;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own study plans" ON public.study_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own exam files select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'exam-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own exam files insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'exam-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own exam files update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'exam-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own exam files delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'exam-files' AND auth.uid()::text = (storage.foldername(name))[1]);

ALTER TABLE public.exam_questions
  ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS exam_questions_subject_id_idx ON public.exam_questions(subject_id);

ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS source_question_id uuid REFERENCES public.exam_questions(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS flashcards_source_question_unique
  ON public.flashcards(source_question_id) WHERE source_question_id IS NOT NULL;