import './globals.css';
import { AuthProvider } from '../lib/AuthContext';
import Header from '../components/Header';

export const metadata = {
  title: 'LibertineConnect — Rencontres entre adultes consentants',
  description: "Plateforme de rencontre pour couples et célibataires ouverts d'esprit, partout en France.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          <Header />
          <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
          <footer className="max-w-6xl mx-auto px-4 py-10 text-xs text-neutral-500 space-y-1">
            <p>Site réservé aux personnes majeures (18 ans et plus). Toute sollicitation à caractère commercial est interdite et sanctionnée par la suppression du compte.</p>
            <p>Un abus ? Utilisez le bouton "Signaler" sur un profil, ou contactez la modération.</p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
