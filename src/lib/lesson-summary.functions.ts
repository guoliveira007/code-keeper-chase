import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiText } from "./exam-ai.server";

const MAX_CHARS = 120_000;

const SYSTEM = `Você é um professor experiente de cursinho pré-vestibular.
Receberá a TRANSCRIÇÃO COMPLETA de uma aula gravada e deve produzir um RESUMO DETALHADO em português do Brasil,
fiel ao que foi dito na aula (não invente conteúdo que não aparece na transcrição).

Estruture o resumo em Markdown, nesta ordem:
1. "## Visão geral" — 3 a 5 linhas sobre o que a aula cobre.
2. "## Conteúdo detalhado" — subtítulos (###) por bloco/tópico da aula, com explicação aprofundada em parágrafos e listas,
   incluindo definições, fórmulas (em texto simples), demonstrações, macetes e observações do professor.
3. "## Exemplos e exercícios resolvidos" — passo a passo dos exercícios comentados na aula (se houver).
4. "## Pegadinhas e erros comuns" — alertas dados pelo professor.
5. "## Resumo relâmpago" — bullets curtos com os pontos que precisam ser decorados.

Seja detalhado e didático: o aluno deve conseguir estudar a aula inteira apenas pelo resumo.`;

/** Gera (ou regera) o resumo detalhado de uma aula a partir da transcrição enviada. */
export const generateLessonSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        lessonId: z.string().min(1),
        lessonTitle: z.string().min(1).max(300),
        subject: z.string().max(120).optional(),
        transcript: z.string().min(200, "A transcrição está curta demais."),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const transcript = data.transcript.slice(0, MAX_CHARS);

    const summary = await aiText(SYSTEM, [
      {
        type: "text",
        text: `Aula: ${data.lessonTitle}${data.subject ? ` (${data.subject})` : ""}\n\nTranscrição:\n"""\n${transcript}\n"""`,
      },
    ]);

    if (!summary.trim()) throw new Error("A IA não conseguiu gerar o resumo. Tente novamente.");

    const { error } = await context.supabase.from("lesson_summaries").upsert(
      {
        user_id: context.userId,
        lesson_id: data.lessonId,
        lesson_title: data.lessonTitle,
        subject: data.subject ?? null,
        transcript,
        summary,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" },
    );
    if (error) throw new Error("Não foi possível salvar o resumo.");

    return { summary };
  });
