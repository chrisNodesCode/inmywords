import { signIn } from "next-auth/react";
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Checkbox } from 'antd';

export default function LandingPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    const result = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });
    if (result?.ok) {
      router.push('/');
    } else if (result?.error) {
      setError(result.error || "Invalid credentials");
    }
  };

  return (
    <div className="landing-page">
      <header className="navbar">
        <nav>
          <ul style={{ display: 'flex', listStyle: 'none', gap: '1.5rem', margin: 0, padding: 0 }}>
            <li><a href="#">Features</a></li>
            <li><a href="/pricing">Pricing</a></li>
            <li><a href="#">About</a></li>
          </ul>
        </nav>
      </header>
        <main className="hero" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Welcome to InMyWords</h1>
          <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>
            A sensory-friendly space to capture your thoughts and ideas.
          </p>
          <button className="indie-button">Get Started</button>
        </main>
      <div className="login-container">
        <h2>Login</h2>
          <div>
            <input
              type="text"
              placeholder="Email or Username"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              className="indie-input"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="indie-input"
            />
          </div>
          <div className="terms-row">
            <Checkbox>
              I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
            </Checkbox>
          </div>
          <div className="button-row">
            <button onClick={handleLogin} className="indie-button">
              Login
            </button>
            <button onClick={() => alert('Account creation is disabled')} className="indie-button">
              Create an account
            </button>
          </div>
          <div className="google-button">
            <button onClick={() => signIn('google')} className="indie-button">
              Sign in with Google
            </button>
          </div>
          {error && <p className="login-error">{error}</p>}
      </div>
    </div>
  );
}