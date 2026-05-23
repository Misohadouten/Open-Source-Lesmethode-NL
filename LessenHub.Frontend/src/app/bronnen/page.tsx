import React from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import BronnenTable from '@/components/BronnenTable';

const BronnenPage: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeItem="Bronnen" />

      <div className="flex-1 ml-64">
        <Header />

        <main className="p-8">
          <h1 className="lh-page-title mb-2">Bronnen</h1>
          <p className="lh-page-subtitle mb-8 max-w-3xl">
            Handige websites, tools en databases die je kunt gebruiken bij het voorbereiden en geven van lessen.
          </p>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-700">Overzicht van bronnen</h2>
            </div>

            <div className="p-6">
              <BronnenTable showFilters={true} />
            </div>
          </div>
        </main>

        <footer className="px-8 py-6 border-t border-gray-200 mt-8">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>© 2025 Lessen Hub. Alle rechten voorbehouden.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-gray-700">Privacy</a>
              <a href="#" className="hover:text-gray-700">Servicevoorwaarden</a>
              <a href="#" className="hover:text-gray-700">Hulp en Veelgestelde vragen</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default BronnenPage;
