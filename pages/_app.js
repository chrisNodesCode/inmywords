// pages/_app.js
import { SessionProvider } from 'next-auth/react';
import '../src/styles/main.css';
import 'antd/dist/reset.css';

export default function App({ Component, pageProps }) {
  return (
    <SessionProvider session={pageProps.session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}