import { useSession } from 'next-auth/react';
import LandingPage from '../src/components/LandingPage';
import DeskSurface from '../src/components/Desk/DeskSurface';

export default function HomePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return null;
  }

  return session ? <DeskSurface /> : <LandingPage />;
}
