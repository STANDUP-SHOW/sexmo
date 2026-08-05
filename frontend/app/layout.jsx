import './globals.css';
import { AuthProvider } from '../lib/AuthContext';
import { SettingsProvider } from '../lib/SettingsContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

export const metadata = {
  title: 'sexmo — Rencontres libertines entre adultes consentants',
  description: "Plateforme de rencontre pour couples et célibataires ouverts d'esprit, partout en France.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <SettingsProvider>
          <AuthProvider>
            <Header />
            <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
            <Footer />
          </AuthProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
