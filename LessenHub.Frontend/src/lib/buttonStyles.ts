/** Gedeelde button-stijlen (LessenHub huisstijl). */

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none';

const orange =
  'bg-[#DE9A5F] text-white hover:bg-[#CF8A4F] shadow-md shadow-[#CF8A4F]/25 ring-1 ring-[#C8874A]/40 focus:ring-[#DE9A5F]/45';

export const btn = {
  base,
  primary: `${base} px-4 py-2 text-sm ${orange}`,
  primaryLg: `${base} px-6 py-2.5 text-sm ${orange}`,
  action: `${base} px-4 py-2 text-sm ${orange}`,
  concepten: `${base} px-5 py-2.5 text-sm bg-[#D18B4A] text-white hover:bg-[#C17B3A] shadow-md shadow-[#C17B3A]/30 ring-1 ring-[#B06F2E]/35 focus:ring-[#D18B4A]/45`,
  secondary: `${base} px-4 py-2 text-sm border-2 border-[#CF8A4F] text-[#6B4423] bg-white hover:bg-[#F5EBE0] font-semibold focus:ring-[#DE9A5F]/40`,
  ghost: `${base} px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-300`,
  danger: `${base} px-4 py-2 text-sm border border-red-400 text-red-700 bg-white hover:bg-red-50 focus:ring-red-300`,
  dangerSolid: `${base} px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 shadow-md focus:ring-red-500/40`,
  approve: `${base} lh-btn-approve px-4 py-2 text-sm focus:ring-green-500/45`,
  reject: `${base} lh-btn-reject px-4 py-2 text-sm focus:ring-red-500/45`,
  icon: 'inline-flex items-center justify-center p-2 rounded-lg border border-[#CF8A4F] text-[#6B4423] bg-white hover:bg-[#F5EBE0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#DE9A5F]/40',
  iconDanger:
    'inline-flex items-center justify-center p-2 rounded-lg border border-red-400 text-red-700 bg-white hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-300',
} as const;

export const inputClass =
  'w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-sm font-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#DE9A5F]/45 focus:border-[#DE9A5F]';

/** Zelfde typografie als globals.css (.lh-page-title / .lh-page-subtitle). */
export const pageTitle = 'lh-page-title';
export const pageSubtitle = 'lh-page-subtitle';
export const sectionTitle = 'text-lg font-semibold text-gray-900';
export const labelClass = 'block text-sm font-medium text-gray-700 mb-2';
