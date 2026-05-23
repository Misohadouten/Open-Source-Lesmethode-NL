import type { LesDuplicaatMatch } from '@/components/LesDuplicaatWaarschuwing';
import type { LeerdoelEnum } from '@/lib/lesFormConstants';

export type DuplicaatStatus = null | 'checking' | 'geen' | 'gevonden';

export interface NewLesFormDraft {
  titel: string;
  leerdoel: LeerdoelEnum[];
  introductie: string;
  inhoud: string;
  slot: string;
  duurMinuten: number;
  lessenserieId: string;
  nieuweLessenserieTitel: string;
  aiLiteratuurlijst: string[];
  duplicaatMatches: LesDuplicaatMatch[];
  duplicaatStatus: DuplicaatStatus;
  duplicaatAcknowledged: boolean;
}

export function draftStorageKey(from: string | null) {
  return `lessenhub:new-les-draft:${from ?? 'new'}`;
}

export function readFormDraft(key: string): NewLesFormDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as NewLesFormDraft;
  } catch {
    return null;
  }
}

export function writeFormDraft(key: string, draft: NewLesFormDraft) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify(draft));
  } catch {
    /* sessionStorage vol of niet beschikbaar */
  }
}

export function clearFormDraft(key: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(key);
}
