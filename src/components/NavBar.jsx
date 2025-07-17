// src/components/NavBar.jsx
import React from 'react';
import { useRouter } from 'next/router';
import { signOut } from 'next-auth/react';
import ThemeSelector from './ThemeSelector';

export default function NavBar({ title, backPath }) {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    localStorage.removeItem('token');
    router.push('/');
  };

  return (
    <div style={{
      width: '100%',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid #ccc'
    }}>
      {backPath ? (
        <span
          style={{ fontWeight: 'bold', cursor: 'pointer' }}
          onClick={() => router.push(backPath)}
        >
          {title}
        </span>
      ) : (
        <span style={{ fontWeight: 'bold' }}>{title}</span>
      )}
      {/* theme switcher pills */}
      <ThemeSelector style={{ margin: '0 1rem' }} />
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
