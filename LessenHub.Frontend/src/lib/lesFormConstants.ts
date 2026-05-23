export type LeerdoelEnum =
  | 'BegrijpendLezen'
  | 'Schrijven'
  | 'Luisteren'
  | 'Spreken'
  | 'Woordenschat'
  | 'Grammatica'
  | 'Cultuurbegrip'
  | 'KritischDenken'
  | 'Samenwerken'
  | 'Probleemoplossing';

export const ALL_LEERDOELEN: { value: LeerdoelEnum; label: string }[] = [
  { value: 'BegrijpendLezen', label: 'Begrijpend lezen' },
  { value: 'Schrijven', label: 'Schrijven' },
  { value: 'Luisteren', label: 'Luisteren' },
  { value: 'Spreken', label: 'Spreken' },
  { value: 'Woordenschat', label: 'Woordenschat' },
  { value: 'Grammatica', label: 'Grammatica' },
  { value: 'Cultuurbegrip', label: 'Cultuurbegrip' },
  { value: 'KritischDenken', label: 'Kritisch denken' },
  { value: 'Samenwerken', label: 'Samenwerken' },
  { value: 'Probleemoplossing', label: 'Probleemoplossing' },
];

export const LEERDOEL_TO_INT: Record<LeerdoelEnum, number> = {
  BegrijpendLezen: 0,
  Schrijven: 1,
  Luisteren: 2,
  Spreken: 3,
  Woordenschat: 4,
  Grammatica: 5,
  Cultuurbegrip: 6,
  KritischDenken: 7,
  Samenwerken: 8,
  Probleemoplossing: 9,
};

export const INT_TO_LEERDOEL: Record<number, LeerdoelEnum> = Object.fromEntries(
  Object.entries(LEERDOEL_TO_INT).map(([k, v]) => [v, k as LeerdoelEnum])
) as Record<number, LeerdoelEnum>;

export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.pptx'];
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

export const AI_ALLOWED_EXTENSIONS = ['.pdf', '.docx'];
export const AI_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/** Windows/browsers geven soms lege of generieke MIME; extensie is leidend. */
export function isAiUploadFileAllowed(file: File): boolean {
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
  if (!AI_ALLOWED_EXTENSIONS.includes(ext)) return false;
  if (!file.type) return true;
  if (AI_ALLOWED_MIME_TYPES.includes(file.type)) return true;
  return file.type === 'application/octet-stream';
}
