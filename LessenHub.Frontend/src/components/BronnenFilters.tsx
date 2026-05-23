'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { BRON_CATEGORIEEN, BRON_TYPES } from '@/data/bronnen';

interface BronnenFiltersProps {
  categorie?: string;
  type?: string;
  onCategorieChange?: (value: string) => void;
  onTypeChange?: (value: string) => void;
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

const BronnenFilters: React.FC<BronnenFiltersProps> = ({
  categorie = '',
  type = '',
  onCategorieChange,
  onTypeChange,
}) => {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
      </div>

      <div className="space-y-4">
        <FilterSelect
          label="Categorie"
          value={categorie}
          onChange={onCategorieChange || (() => {})}
          options={BRON_CATEGORIEEN.map((c) => ({ label: c, value: c }))}
        />
        <FilterSelect
          label="Type bron"
          value={type}
          onChange={onTypeChange || (() => {})}
          options={BRON_TYPES.map((t) => ({ label: t, value: t }))}
        />
      </div>
    </div>
  );
};

export default BronnenFilters;
