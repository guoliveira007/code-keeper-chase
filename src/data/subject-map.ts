import { subjects as catalog } from "./subjects";
import type { Lesson, Subject as CatalogSubject } from "./types";

/** Nome da matéria no banco -> id da matéria no catálogo de aulas. */
const CATALOG_BY_NAME: Record<string, string> = {
  "Biologia": "biologia",
  "Química": "quimica",
  "Física": "fisica",
  "Matemática": "matematica",
  "Geografia": "geografia",
  "História": "historia",
  "Português": "portugues",
  "Filosofia e Sociologia": "filosofia",
};

export function catalogSubjectFor(name: string): CatalogSubject | undefined {
  const id = CATALOG_BY_NAME[name];
  return id ? catalog.find((s) => s.id === id) : undefined;
}

/**
 * Frente do catálogo a partir do nome da subpasta no banco.
 * "Biologia (Frente 1)" -> "1"; "Português (Frente Redação)" -> "Redação";
 * "Filosofia" -> "Filosofia".
 */
export function frenteKeyFromName(childName: string): string {
  const inside = childName.match(/\(([^)]+)\)\s*$/)?.[1] ?? childName;
  return inside.replace(/^Frente\s+/i, "").trim();
}

/** Aulas de uma matéria do banco (matéria-mãe = todas as frentes). */
export function lessonsForSubject(
  subjectName: string,
  parentName?: string | null,
): Lesson[] {
  if (parentName) {
    const parent = catalogSubjectFor(parentName);
    if (!parent) return [];
    const key = frenteKeyFromName(subjectName).toLowerCase();
    return parent.lessons.filter((l) => l.frente.toLowerCase() === key);
  }
  return catalogSubjectFor(subjectName)?.lessons ?? [];
}

/** Índice global de aulas por id, para resolver o vínculo salvo no banco. */
const ALL_LESSONS: Record<string, Lesson> = Object.fromEntries(
  catalog.flatMap((s) => s.lessons.map((l) => [l.id, l] as const)),
);

/** Aula pelo id salvo em materiais / flashcards / questões. */
export function lessonById(id?: string | null): Lesson | undefined {
  return id ? ALL_LESSONS[id] : undefined;
}

/** Rótulo curto da aula, ex.: "10/fev · Introdução à geometria". */
export function lessonLabel(lesson: Lesson) {
  return `${lesson.date} · ${lesson.title}`;
}
