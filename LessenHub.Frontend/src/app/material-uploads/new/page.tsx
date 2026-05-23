'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { createLessenSerie } from '@/lib/lessenserieApi';
import { useRouter } from 'next/navigation';
import LessenSerieAanmakenForm, {
  type LessenSerieFormValues,
} from '@/components/LessenSerieAanmakenForm';
import { VAARDIGHEDEN_API_INT } from '@/lib/lessenSerieFormConstants';

export default function NewLessenSeriePage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleSubmit = async (values: LessenSerieFormValues) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const ownerId = user?.docentId;
      const payload = {
        Titel: values.titel,
        Omschrijving: values.omschrijving,
        SchoolNiveau: parseInt(values.schoolNiveau, 10),
        TaalNiveau: parseInt(values.taalNiveau, 10),
        TaalniveauMeijerink: values.taalniveauMeijerink || null,
        Leerjaren: values.leerjaren.map((v) => parseInt(v, 10)),
        Leerjaar: values.leerjaren.length > 0 ? parseInt(values.leerjaren[0], 10) : null,
        Vaardigheden: values.vaardigheden.map((v) => VAARDIGHEDEN_API_INT[v] ?? 0),
        SloKerndoelen: values.sloKerndoelen,
        OverigeVakken: values.overigeVakken,
        Literatuurlijst: values.literatuurlijst,
        Leerdoelen: [],
        Eigenaar: {
          ...(ownerId ? { Id: ownerId } : {}),
          Naam: user?.name || '',
          Email: user?.email || '',
        },
        Lessen: [],
        Bijlagen: [],
        Beoordelingen: [],
      } satisfies Record<string, unknown>;

      const created = await createLessenSerie(payload);
      if (created?.id) {
        router.push(`/lessen/new?from=${encodeURIComponent(created.id)}`);
      } else {
        router.push('/material-uploads');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Aanmaken mislukt.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeItem="Mijn uploads" />
      <div className="flex-1 ml-64">
        <Header />
        <main className="p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="lh-page-title">Nieuwe lessenserie</h1>
            <p className="lh-page-subtitle">
              Stap 1: beschrijf je serie. Stap 2 (na opslaan): voeg lessen en documenten toe.
            </p>
          </div>

          <LessenSerieAanmakenForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            error={error}
            submitLabel="Serie aanmaken en lessen toevoegen"
          />
        </main>
      </div>
    </div>
  );
}
