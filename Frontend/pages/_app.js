// pages/_app.js
import "../styles/globals.css";
import 'leaflet/dist/leaflet.css';
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "600", "700"] });

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
