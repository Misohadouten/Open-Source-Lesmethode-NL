'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { Mail, User } from 'lucide-react';
import { pageTitle, pageSubtitle } from '@/lib/buttonStyles';

const SettingsPage: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeItem="Instellingen" />

      <div className="flex-1 ml-64">
        <Header />

        <main className="p-8">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#E4AE7E] mb-2">Profiel</p>
            <h1 className={pageTitle}>Jouw gegevens</h1>
            <p className={pageSubtitle}>Je persoonsgegevens zijn veilig bij ons en worden automatisch ingeladen vanuit de instelling.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {isLoading ? (
              <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm animate-pulse">
                <div className="h-6 w-48 bg-gray-100 rounded mb-6" />
                <div className="space-y-4">
                  <div className="h-16 bg-gray-50 rounded-xl" />
                  <div className="h-16 bg-gray-50 rounded-xl" />
                  <div className="h-16 bg-gray-50 rounded-xl" />
                </div>
              </aside>
            ) : (
            <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-700">
                  <User size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Huidige profielgegevens</h2>
                  <p className="text-sm text-gray-600">Deze gegevens zijn gekoppeld aan je account.</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-gray-700">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Naam</p>
                  <p className="mt-1 font-medium text-gray-900">{user?.name || 'Gebruiker'}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">E-mail</p>
                  <div className="mt-1 flex items-center gap-2 font-medium text-gray-900">
                    <Mail size={16} className="text-[#E4AE7E]" />
                    <span>{user?.email || 'Geen e-mailadres gevonden'}</span>
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Personeelsnummer (ID)</p>
                  <p className="mt-1 font-medium text-gray-900">{user?.docentId || 'Niet beschikbaar'}</p>
                </div>
              </div>
            </aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
