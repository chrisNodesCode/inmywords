import '../src/App.css';
import React from 'react';


// Custom App to include global CSS
export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}