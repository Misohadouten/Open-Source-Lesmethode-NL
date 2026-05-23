import { redirect } from 'next/navigation';

type PageProps = {
  params: { id: string };
};

/** Oude route — doorverwijzing naar bewerken onder Mijn uploads. */
export default function EditLessenSerieRedirectPage({ params }: PageProps) {
  redirect(`/material-uploads/${params.id}/edit`);
}
