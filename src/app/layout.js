import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Delray Rocks — Youth Football Intelligence Platform',
  description: 'The most advanced youth football management and player development platform. AI-powered video analysis, real-time evaluations, and team operations for Delray Rocks Football & Cheerleading.',
  keywords: 'Delray Rocks, youth football, player evaluation, video analysis, team management, Delray Beach',
  manifest: '/manifest.json',
  themeColor: '#009A44',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Delray Rocks',
  },
  openGraph: {
    title: 'Delray Rocks — Youth Football Intelligence Platform',
    description: 'AI-powered youth football management for coaches and parents.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/dr-logo.jpg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(15, 23, 42, 0.95)',
              color: '#F1F5F9',
              border: '1px solid rgba(148, 163, 184, 0.12)',
              borderRadius: '12px',
              backdropFilter: 'blur(20px)',
              fontSize: '0.875rem',
              padding: '12px 16px',
            },
            success: {
              iconTheme: {
                primary: '#22C55E',
                secondary: '#0D1B2A',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#0D1B2A',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
