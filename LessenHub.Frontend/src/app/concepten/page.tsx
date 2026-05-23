// app/concepten/page.tsx
import React from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ConceptenTable from '@/components/ConceptenTable';

const ConceptenPage: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeItem="Concepten" />

      <div className="flex-1 ml-64">
        <Header />

        <main className="p-8">
          <h1 className="lh-page-title mb-8">Concepten</h1>

          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <ConceptenTable />
          </div>
        </main>

        <footer className="px-8 py-6 border-t border-gray-200 mt-8">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>© 2025 Lessen Hub. Alle rechten voorbehouden.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-gray-700">
                Privacy
              </a>
              <a href="#" className="hover:text-gray-700">
                Servicevoorwaarden
              </a>
              <a href="#" className="hover:text-gray-700">
                Hulp en Veelgestelde vragen
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ConceptenPage;
