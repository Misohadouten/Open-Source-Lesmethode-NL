import { redirect } from 'next/navigation';

/** Oude route — doorverwijzing naar Mijn uploads. */
export default function LessenSeriesRedirectPage() {
  redirect('/material-uploads');
}
