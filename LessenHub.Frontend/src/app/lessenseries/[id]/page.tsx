import { redirect } from 'next/navigation';

type PageProps = {
  params: { id: string };
};

/** Oude route — doorverwijzing naar Mijn uploads detail. */
export default function LessenSerieDetailRedirectPage({ params }: PageProps) {
  redirect(`/material-uploads/${params.id}`);
}
