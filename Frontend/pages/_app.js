// pages/_app.js
import "../styles/globals.css";
import 'leaflet/dist/leaflet.css';
import { AuthProvider } from "../context/AuthContext";
import { SettingsProvider } from "../context/SettingsContext";

export default function App({ Component, pageProps }) {
  return (
    <div>
      <AuthProvider>
        <SettingsProvider>
          <Component {...pageProps} />
        </SettingsProvider>
      </AuthProvider>
    </div>
  );
}


