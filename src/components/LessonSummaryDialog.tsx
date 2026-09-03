import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Loader2, Upload } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { generateLessonSummary } from "@/lib/lesson-summary.functions";

type Props = {
  lesson: { id: string; title: string; subject?: string } | null;
  onOpenChange: (open: boolean) => void;
};

async function fetchSummary(lessonId: string) {
  const { data, error } = await supabase
    .from("lesson_summaries")
    .select("summary,transcript,updated_at")
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function LessonSummaryDialog({ lesson, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const generate = useServerFn(generateLessonSummary);
  const [transcript, setTranscript] = useState("");
  const [editing, setEditing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["lesson-summary", lesson?.id],
    queryFn: () => fetchSummary(lesson!.id),
    enabled: !!lesson,
  });

  useEffect(() => {
    setTranscript("");
    setEditing(false);
  }, [lesson?.id]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!lesson) return;
      return generate({
        data: {
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          subject: lesson.subject,
          transcript: transcript.trim(),
        },
      });
    },
    onSuccess: () => {
      toast.success("Resumo gerado!");
      setEditing(false);
      setTranscript("");
      queryClient.invalidateQueries({ queryKey: ["lesson-summary", lesson?.id] });
      queryClient.invalidateQueries({ queryKey: ["lesson-summaries"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar o resumo.");
    },
  });

  async function onFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 5 MB).");
      return;
    }
    setTranscript(await file.text());
  }

  const showForm = editing || (!isLoading && !data?.summary);

  return (
    <Dialog open={!!lesson} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6 text-left text-base">
            Resumo · {lesson?.title ?? ""}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <Loader2 className="size-4 animate-spin" /> carregando…
          </p>
        )}

        {showForm && (
          <div className="space-y-3">
            <p className="text-sm text-ink-soft">
              Cole a transcrição completa da aula (ou envie um arquivo .txt) e a IA monta um resumo
              detalhado fiel ao que foi dito.
            </p>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Cole aqui a transcrição da aula…"
              className="h-56 w-full resize-y rounded-md border border-line bg-background p-3 text-sm outline-none focus:border-sun"
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-line px-3 py-1.5 font-mono text-[11px] text-ink-soft transition-colors hover:text-sun-deep">
                <Upload className="size-3.5" /> enviar .txt
                <input
                  type="file"
                  accept=".txt,.md,.srt,.vtt,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <span className="font-mono text-[10px] text-ink-soft">
                {transcript.length.toLocaleString("pt-BR")} caracteres
              </span>
              <button
                disabled={mutation.isPending || transcript.trim().length < 200}
                onClick={() => mutation.mutate()}
                className="ml-auto flex items-center gap-1.5 rounded-md bg-sun px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileText className="size-4" />
                )}
                {data?.summary ? "Regerar resumo" : "Gerar resumo"}
              </button>
            </div>
          </div>
        )}

        {!showForm && data?.summary && (
          <div className="space-y-4">
            <div className="prose prose-sm max-w-none text-ink prose-headings:font-display prose-headings:text-ink prose-strong:text-ink">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.summary}</ReactMarkdown>
            </div>
            <button
              onClick={() => {
                setTranscript(data.transcript ?? "");
                setEditing(true);
              }}
              className="rounded-md border border-line px-3 py-1.5 font-mono text-[11px] text-ink-soft transition-colors hover:text-sun-deep"
            >
              enviar nova transcrição
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
