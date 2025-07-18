import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

export default function NavBar() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const stored = localStorage.getItem('theme') || 'light';
    setTheme(stored);
    document.documentElement.setAttribute('data-theme', stored);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link href="/dashboard" className="navbar-link">Dashboard</Link>
      </div>
      <div className="navbar-center">
        <Link href="#" className="navbar-link">Profile</Link>
      </div>
      <div className="navbar-right">
        <button onClick={toggleTheme} className="theme-toggle-btn">
          {theme === 'light' ? 'Dark' : 'Light'} Mode
        </button>
        <button onClick={() => signOut({ callbackUrl: '/' })} className="logout-btn">
          Logout
        </button>
      </div>
    </nav>
  );
}
