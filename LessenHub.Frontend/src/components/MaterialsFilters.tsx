// components/MaterialsFilters.tsx
'use client';
import React from 'react';
import { ChevronDown } from 'lucide-react';

interface MaterialsFiltersProps {
  schoolNiveau?: string;
  taalNiveau?: string;
  leerjaar?: string;
  vaardigheden?: string;
  onSchoolNiveauChange?: (value: string) => void;
  onTaalNiveauChange?: (value: string) => void;
  onLeerjaarChange?: (value: string) => void;
  onVaardigheidChange?: (value: string) => void;
}

type FilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
};

const FilterSelect: React.FC<FilterSelectProps> = ({ label, value, onChange, options }) => (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-gray-900 mb-2">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-[#E4AE7E] rounded-lg appearance-none bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E4AE7E] focus:border-transparent"
      >
        <option value="">Selecteer...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
    </div>
  </div>
);

const MaterialsFilters: React.FC<MaterialsFiltersProps> = ({
  schoolNiveau = '',
  taalNiveau = '',
  leerjaar = '',
  vaardigheden = '',
  onSchoolNiveauChange,
  onTaalNiveauChange,
  onLeerjaarChange,
  onVaardigheidChange,
}) => {
  const leerjaarOptions = (() => {
    if (schoolNiveau === 'VMBO' || schoolNiveau === 'MBO') {
      return [
        { label: 'Leerjaar 1', value: 'EersteLeerjaar' },
        { label: 'Leerjaar 2', value: 'TweedeLeerjaar' },
        { label: 'Leerjaar 3', value: 'DerdeLeerjaar' },
        { label: 'Leerjaar 4', value: 'VierdeLeerjaar' },
      ];
    }

    if (schoolNiveau === 'HAVO') {
      return [
        { label: 'Leerjaar 1', value: 'EersteLeerjaar' },
        { label: 'Leerjaar 2', value: 'TweedeLeerjaar' },
        { label: 'Leerjaar 3', value: 'DerdeLeerjaar' },
        { label: 'Leerjaar 4', value: 'VierdeLeerjaar' },
        { label: 'Leerjaar 5', value: 'VijfdeLeerjaar' },
      ];
    }

    if (schoolNiveau === 'VWO') {
      return [
        { label: 'Leerjaar 1', value: 'EersteLeerjaar' },
        { label: 'Leerjaar 2', value: 'TweedeLeerjaar' },
        { label: 'Leerjaar 3', value: 'DerdeLeerjaar' },
        { label: 'Leerjaar 4', value: 'VierdeLeerjaar' },
        { label: 'Leerjaar 5', value: 'VijfdeLeerjaar' },
        { label: 'Leerjaar 6', value: 'ZesdeLeerjaar' },
      ];
    }

    // Default to all 6 years when no school niveau is selected yet
    return [
      { label: 'Leerjaar 1', value: 'EersteLeerjaar' },
      { label: 'Leerjaar 2', value: 'TweedeLeerjaar' },
      { label: 'Leerjaar 3', value: 'DerdeLeerjaar' },
      { label: 'Leerjaar 4', value: 'VierdeLeerjaar' },
      { label: 'Leerjaar 5', value: 'VijfdeLeerjaar' },
      { label: 'Leerjaar 6', value: 'ZesdeLeerjaar' },
    ];
  })();

  return (
    <div>
      {/* Filters Header */}
      <div className="flex items-center gap-2 mb-6">
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
      </div>

      {/* Filter Options */}
      <div className="space-y-4">
        <FilterSelect 
          label="Onderwijsniveau" 
          value={schoolNiveau}
          onChange={onSchoolNiveauChange || (() => {})}
          options={[
            { label: 'VMBO (leerjaar 1 t/m 4)', value: 'VMBO' },
            { label: 'HAVO (leerjaar 1 t/m 5)', value: 'HAVO' },
            { label: 'VWO (leerjaar 1 t/m 6)', value: 'VWO' },
            { label: 'MBO (leerjaar 1 t/m 4)', value: 'MBO' },
          ]}
        />
        <FilterSelect 
          label="Taalniveau" 
          value={taalNiveau}
          onChange={onTaalNiveauChange || (() => {})}
          options={[
            { label: 'A1', value: 'A1' },
            { label: 'A2', value: 'A2' },
            { label: 'B1', value: 'B1' },
            { label: 'B2', value: 'B2' },
            { label: 'C1', value: 'C1' },
            { label: 'C2', value: 'C2' },
          ]}
        />
        <FilterSelect 
          label="Leerjaar" 
          value={leerjaar}
          onChange={onLeerjaarChange || (() => {})}
          options={leerjaarOptions}
        />
        <FilterSelect 
          label="Vaardigheid" 
          value={vaardigheden}
          onChange={onVaardigheidChange || (() => {})}
          options={[
            { label: 'Communicatie', value: 'Communicatie' },
            { label: 'Samenwerking', value: 'Samenwerking' },
            { label: 'Probleemoplossing', value: 'Probleemoplossing' },
            { label: 'Creativiteit', value: 'Creativiteit' },
            { label: 'Kritisch Denken', value: 'KritischDenken' },
            { label: 'Leiderschap', value: 'Leiderschap' },
            { label: 'Tijdsbeheer', value: 'Tijdsbeheer' },
            { label: 'Technologische Vaardigheden', value: 'TechnologischeVaardigheden' },
            { label: 'Aanpassingsvermogen', value: 'Aanpassingsvermogen' },
            { label: 'Emotionele Intelligentie', value: 'EmotioneleIntelligentie' },
          ]}
        />
      </div>
    </div>
  );
};

export default MaterialsFilters;