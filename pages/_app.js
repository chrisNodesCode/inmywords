// pages/_app.js
import { SessionProvider } from 'next-auth/react';
import '../src/styles/main.css';
import 'antd/dist/reset.css';
import ThemeProvider from '../src/components/ThemeProvider';

export default function App(props) {
  const { Component, pageProps } = props;
  return (
    <SessionProvider session={pageProps.session}>
      <ThemeProvider>
        <Component {...pageProps} />
      </ThemeProvider>
    </SessionProvider>
  );
}
