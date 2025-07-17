// pages/_app.js
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '../src/theme/ThemeContext';
import '../src/index.css';
import '../src/App.css';

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <SessionProvider session={pageProps.session}>
        <Component {...pageProps} />
      </SessionProvider>
    </ThemeProvider>
  );
}