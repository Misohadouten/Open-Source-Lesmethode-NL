'use client';

import React, { useState } from 'react';
import { Search, ExternalLink } from 'lucide-react';
import { BRONNEN, type Bron } from '@/data/bronnen';
import BronnenFilters from './BronnenFilters';
import { btn, inputClass } from '@/lib/buttonStyles';

interface BronnenTableProps {
  showFilters?: boolean;
}

const BronnenTableContent: React.FC<{
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredBronnen: Bron[];
}> = ({ searchQuery, setSearchQuery, filteredBronnen }) => (
  <div>
    <div className="mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Zoek naar bron..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`${inputClass} pl-10`}
        />
      </div>
    </div>

    {filteredBronnen.length === 0 ? (
      <div className="text-center py-8 text-gray-500">Geen bronnen gevonden</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Titel</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Omschrijving</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Categorie</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Acties</th>
            </tr>
          </thead>
          <tbody>
            {filteredBronnen.map((bron) => (
              <tr key={bron.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4 text-gray-900 font-semibold">{bron.titel}</td>
                <td className="py-4 px-4 text-gray-600 max-w-md">{bron.omschrijving}</td>
                <td className="py-4 px-4 text-gray-700 whitespace-nowrap">{bron.categorie}</td>
                <td className="py-4 px-4 text-gray-700 whitespace-nowrap">
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-100">
                    {bron.type}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <a
                    href={bron.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${btn.secondary} text-sm`}
                    title={`Open ${bron.titel}`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Bezoeken
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const BronnenTable: React.FC<BronnenTableProps> = ({ showFilters = true }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categorie, setCategorie] = useState('');
  const [type, setType] = useState('');

  const filteredBronnen = BRONNEN.filter((bron) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      bron.titel.toLowerCase().includes(q) ||
      bron.omschrijving.toLowerCase().includes(q) ||
      bron.categorie.toLowerCase().includes(q);
    const matchesCategorie = !categorie || bron.categorie === categorie;
    const matchesType = !type || bron.type === type;
    return matchesSearch && matchesCategorie && matchesType;
  });

  if (showFilters) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <BronnenTableContent
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filteredBronnen={filteredBronnen}
          />
        </div>
        <div className="lg:col-span-1">
          <BronnenFilters
            categorie={categorie}
            type={type}
            onCategorieChange={setCategorie}
            onTypeChange={setType}
          />
        </div>
      </div>
    );
  }

  return (
    <BronnenTableContent
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      filteredBronnen={filteredBronnen}
    />
  );
};

export default BronnenTable;
