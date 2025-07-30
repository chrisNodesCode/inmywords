import { signIn } from "next-auth/react";
import React, { useState } from 'react';

export default function LandingPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    signIn("credentials", {
      username,
      password,
      redirect: false,
    }).then(({ ok, error: signError }) => {
      if (ok) {
        () => onLogin();
      } else {
        setError(signError || "Invalid credentials");
      }
    });
  };

  return (
    <div className="landing-page">
      <header className="navbar">
        <nav>
          <ul style={{ display: 'flex', listStyle: 'none', gap: '1.5rem', margin: 0, padding: 0 }}>
            <li><a href="#">Features</a></li>
            <li><a href="#">Pricing</a></li>
            <li><a href="#">About</a></li>
          </ul>
        </nav>
      </header>
      <main className="hero" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Welcome to InMyWords</h1>
        <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>
          A sensory-friendly space to capture your thoughts and ideas.
        </p>
        <button
          onClick={onLogin}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#0070f3',
            color: '#fff',
          }}
        >
          Get Started
        </button>
      </main>
      <div className="login-container">
        <h2>Login</h2>
        <div>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={{ width: '100%', marginBottom: '0.5rem' }}
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', marginBottom: '1rem' }}
          />
        </div>
        <div>
          <button onClick={handleLogin} style={{ marginRight: '0.5rem' }}>
            Login
          </button>
          <button onClick={() => alert('Account creation is disabled')}>
            Create an account
          </button>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    </div>
  );
}