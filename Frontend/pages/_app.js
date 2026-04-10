// pages/_app.js
import "../styles/globals.css";
import 'leaflet/dist/leaflet.css';
import { Montserrat } from "next/font/google";
import Head from "next/head";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "600", "700"] });

export default function App({ Component, pageProps }) {
  return (
    <div className={montserrat.className}>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Component {...pageProps} />
    </div>
  );
}
