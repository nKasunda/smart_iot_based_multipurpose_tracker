// pages/_app.js
import "../styles/globals.css";
import 'leaflet/dist/leaflet.css';
import { AuthProvider } from "../context/AuthContext";

export default function App({ Component, pageProps }) {
  return (
    <div>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </div>
  );
}
