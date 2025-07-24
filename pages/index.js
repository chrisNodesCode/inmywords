import { useSession } from 'next-auth/react';
import LandingPage from '../src/components/LandingPage';
import Notebook from '../src/components/Notebook';

export default function HomePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return null;
  }

  return session ? <Notebook /> : <LandingPage />;
}
