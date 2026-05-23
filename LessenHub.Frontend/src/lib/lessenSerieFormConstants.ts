/** Opties en hulpteksten voor het lessenserie-aanmakenformulier. */

export const SCHOOL_NIVEAU_OPTIONS = [
  { value: '0', label: 'VMBO' },
  { value: '1', label: 'HAVO' },
  { value: '2', label: 'VWO' },
  { value: '3', label: 'MBO' },
] as const;

export const CEFR_TAAL_NIVEAU_OPTIONS = [
  { value: '0', label: 'A1' },
  { value: '1', label: 'A2' },
  { value: '2', label: 'B1' },
  { value: '3', label: 'B2' },
  { value: '4', label: 'C1' },
  { value: '5', label: 'C2' },
] as const;

/** Referentiekader Meijerink (NT2 / taalontwikkeling). */
export const MEIJERINK_NIVEAU_OPTIONS = [
  { value: '', label: 'Niet van toepassing' },
  { value: '1F', label: '1F' },
  { value: '1F+', label: '1F+' },
  { value: '2F', label: '2F' },
  { value: '2F+', label: '2F+' },
  { value: '3F', label: '3F' },
  { value: '3F+', label: '3F+' },
  { value: '4F', label: '4F' },
] as const;

export const LEERJAAR_OPTIONS_BY_SCHOOL: Record<string, { value: string; label: string }[]> = {
  '0': [
    { value: '0', label: '1e leerjaar' },
    { value: '1', label: '2e leerjaar' },
    { value: '2', label: '3e leerjaar' },
    { value: '3', label: '4e leerjaar' },
  ],
  '1': [
    { value: '0', label: '1e leerjaar' },
    { value: '1', label: '2e leerjaar' },
    { value: '2', label: '3e leerjaar' },
    { value: '3', label: '4e leerjaar' },
    { value: '4', label: '5e leerjaar' },
  ],
  '2': [
    { value: '0', label: '1e leerjaar' },
    { value: '1', label: '2e leerjaar' },
    { value: '2', label: '3e leerjaar' },
    { value: '3', label: '4e leerjaar' },
    { value: '4', label: '5e leerjaar' },
    { value: '5', label: '6e leerjaar' },
  ],
  '3': [
    { value: '0', label: '1e leerjaar' },
    { value: '1', label: '2e leerjaar' },
    { value: '2', label: '3e leerjaar' },
    { value: '3', label: '4e leerjaar' },
  ],
};

/** Volgorde moet overeenkomen met LessenHub.Domain.Enums.VaardighedenEnum */
export const VAARDIGHEDEN_API_INT: Record<string, number> = {
  Lezen: 0,
  Luisteren: 1,
  Schrijven: 2,
  Spreken: 3,
  GesprekkenVoeren: 4,
  Reflectie: 5,
  Taalbeschouwing: 6,
  Literatuur: 7,
  VakoverstijgendTaalonderwijs: 8,
};

export const VAARDIGHEDEN_OPTIONS = [
  { key: 'Lezen', label: 'Lezen' },
  { key: 'Luisteren', label: 'Luisteren' },
  { key: 'Schrijven', label: 'Schrijven' },
  { key: 'Spreken', label: 'Spreken' },
  { key: 'GesprekkenVoeren', label: 'Gesprekken voeren' },
  { key: 'Reflectie', label: 'Reflectie' },
  { key: 'Taalbeschouwing', label: 'Taalbeschouwing' },
  { key: 'Literatuur', label: 'Literatuur' },
  { key: 'VakoverstijgendTaalonderwijs', label: 'Vakoverstijgend taalonderwijs' },
] as const;

/** SLO kerndoelen taal — code + korte toelichting voor tooltip. */
export const SLO_KERNDOELEN: { code: string; titel: string; beschrijving: string }[] = [
  {
    code: '2A',
    titel: '2A — Mondeling begrijpen',
    beschrijving:
      'De leerling kan eenvoudige gesproken teksten begrijpen over alledaagse onderwerpen (instructies, korte uitleg).',
  },
  {
    code: '2B',
    titel: '2B — Schriftelijk begrijpen',
    beschrijving:
      'De leerling kan eenvoudige geschreven teksten begrijpen (korte berichten, eenvoudige instructies).',
  },
  {
    code: '2C',
    titel: '2C — Mondeling productie',
    beschrijving:
      'De leerling kan eenvoudig mondeling communiceren in vaste situaties (vragen stellen, kort antwoorden).',
  },
  {
    code: '3A',
    titel: '3A — Mondeling begrijpen',
    beschrijving:
      'De leerling begrijpt duidelijk gesproken teksten over bekende onderwerpen in de leefwereld en school.',
  },
  {
    code: '3B',
    titel: '3B — Schriftelijk begrijpen',
    beschrijving:
      'De leerling begrijpt duidelijke geschreven teksten over bekende onderwerpen (informatieve teksten, instructies).',
  },
  {
    code: '3C',
    titel: '3C — Mondeling productie',
    beschrijving:
      'De leerling kan mondeling communiceren over bekende onderwerpen met voldoende woordenschat en zinnen.',
  },
  {
    code: '4A',
    titel: '4A — Mondeling begrijpen',
    beschrijving:
      'De leerling begrijpt het belangrijkste van duidelijk mondeling taalgebruik in standaarddialect (uitleg, discussie).',
  },
  {
    code: '4B',
    titel: '4B — Schriftelijk begrijpen',
    beschrijving:
      'De leerling begrijpt duidelijke geschreven teksten over actuele en algemene onderwerpen.',
  },
  {
    code: '5A',
    titel: '5A — Mondeling productie',
    beschrijving:
      'De leerling kan mondeling een reeks elementen verbinden tot een samenhangende tekst over bekende onderwerpen.',
  },
  {
    code: '6A',
    titel: '6A — Mondeling begrijpen',
    beschrijving:
      'De leerling begrijpt het belangrijkste van uitgebreid mondeling taalgebruik (presentaties, instructies).',
  },
  {
    code: '6B',
    titel: '6B — Schriftelijk begrijpen',
    beschrijving:
      'De leerling begrijpt informatieve en argumentatieve teksten; kan hoofd- en bijzaken onderscheiden.',
  },
  {
    code: '6C',
    titel: '6C — Mondeling productie',
    beschrijving:
      'De leerling kan mondeling helder en gestructureerd communiceren over uiteenlopende onderwerpen.',
  },
  {
    code: '6D',
    titel: '6D — Schriftelijk productie',
    beschrijving:
      'De leerling kan een samenhangende schriftelijke tekst schrijven met passende structuur en register.',
  },
  {
    code: '7A',
    titel: '7A — Mondeling begrijpen',
    beschrijving:
      'De leerling begrijpt lange mondelinge teksten en kan impliciete betekenis en standpunten herkennen.',
  },
  {
    code: '7B',
    titel: '7B — Schriftelijk begrijpen',
    beschrijving:
      'De leerling begrijpt complexe geschreven teksten en kan argumentatie en intentie van de schrijver duiden.',
  },
  {
    code: '8A',
    titel: '8A — Mondeling productie',
    beschrijving:
      'De leerling kan mondeling vloeiend en nauwkeurig spreken, met passende intonatie en woordkeuze.',
  },
  {
    code: '8B',
    titel: '8B — Schriftelijk productie',
    beschrijving:
      'De leerling kan heldere, goed gestructureerde teksten schrijven met variatie in zinsbouw en precieze formulering.',
  },
  {
    code: '9A',
    titel: '9A — Mondeling begrijpen',
    beschrijving:
      'De leerling begrijpt vrijwel alle vormen van mondeling taalgebruik, ook wanneer tempo en accent afwijken.',
  },
  {
    code: '9B',
    titel: '9B — Schriftelijk begrijpen',
    beschrijving:
      'De leerling begrijpt complexe en literaire teksten; kan nuance, ironie en implicaties interpreteren.',
  },
  {
    code: '9C',
    titel: '9C — Mondeling productie',
    beschrijving:
      'De leerling kan mondeling spontaan en precies formuleren in formele en informele situaties.',
  },
  {
    code: '9D',
    titel: '9D — Schriftelijk productie',
    beschrijving:
      'De leerling kan stilistisch vaardige teksten schrijven, afgestemd op doel, publiek en genre.',
  },
];

export const LEERJAAR_ENUM_NAMES = [
  'EersteLeerjaar',
  'TweedeLeerjaar',
  'DerdeLeerjaar',
  'VierdeLeerjaar',
  'VijfdeLeerjaar',
  'ZesdeLeerjaar',
] as const;

export function leerjaarValuesToEnums(values: string[]): string[] {
  return values
    .map((v) => LEERJAAR_ENUM_NAMES[Number(v)])
    .filter((name): name is string => !!name);
}

export function leerjaarEnumsToValues(enums: string[] | null | undefined): string[] {
  if (!enums?.length) return [];
  return enums
    .map((name) => LEERJAAR_ENUM_NAMES.indexOf(name as (typeof LEERJAAR_ENUM_NAMES)[number]))
    .filter((i) => i >= 0)
    .map(String);
}
