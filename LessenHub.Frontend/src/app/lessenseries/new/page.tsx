import { redirect } from 'next/navigation';

/** Oude route — doorverwijzing naar nieuwe lessenserie. */
export default function NewLessenSeriesRedirectPage() {
  redirect('/material-uploads/new');
}
