import React, { useState } from 'react';

export default function LandingPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    const validUsername = process.env.NEXT_PUBLIC_ADMIN_USER;
    const validPassword = process.env.NEXT_PUBLIC_ADMIN_LOGIN;

    if (username === validUsername && password === validPassword) {
      onLogin();
    } else {
      setError('Invalid credentials');
    }
  };
  console.log('VITE_ADMIN_USER:', process.env.NEXT_PUBLIC_ADMIN_USER);
  console.log('VITE_ADMIN_LOGIN:', process.env.NEXT_PUBLIC_ADMIN_LOGIN);
  return (
    <div className="landing-page" style={{ maxWidth: '300px', margin: '0 auto', padding: '2rem' }}>
      <h2>Welcome</h2>
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
        <button onClick={() => alert('Account creation is disabled')} style={{ marginRight: '0.5rem' }}>
          Create an account
        </button>
        <button onClick={handleLogin}>Login</button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}