// pages/_app.js
import { SessionProvider } from 'next-auth/react';
import '../src/index.css';
import '../src/App.css';

export default function App({ Component, pageProps }) {
  return (
    <SessionProvider session={pageProps.session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}