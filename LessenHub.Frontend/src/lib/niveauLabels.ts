const LEERJAAR_LABELS: Record<string, string> = {
  EersteLeerjaar: 'Leerjaar 1',
  TweedeLeerjaar: 'Leerjaar 2',
  DerdeLeerjaar: 'Leerjaar 3',
  VierdeLeerjaar: 'Leerjaar 4',
  VijfdeLeerjaar: 'Leerjaar 5',
  ZesdeLeerjaar: 'Leerjaar 6',
};

const SCHOOL_NIVEAU_LABELS: Record<string, string> = {
  VMBO: 'VMBO',
  HAVO: 'HAVO',
  VWO: 'VWO',
  MBO: 'MBO',
  '0': 'VMBO',
  '1': 'HAVO',
  '2': 'VWO',
  '3': 'MBO',
};

export function formatSchoolNiveau(value: string | null | undefined): string {
  if (!value) return '-';
  return SCHOOL_NIVEAU_LABELS[value] ?? value;
}

export function formatTaalNiveau(value: string | null | undefined): string {
  if (!value) return '-';
  return value;
}

export function formatLeerjaar(value: string | null | undefined): string {
  if (!value) return '-';
  return LEERJAAR_LABELS[value] ?? value;
}

export function formatLeerjaren(values: string[] | null | undefined): string {
  if (!values?.length) return '-';
  return values.map((v) => formatLeerjaar(v)).join(', ');
}
