import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/providers/ThemeProvider'
import OfflineBanner from '@/components/OfflineBanner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SilverCore Command',
  description: 'Business command platform by SilverCore Systems',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SilverCore',
  },
}

export const viewport: Viewport = {
  themeColor: '#030712',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

// Inline script: prevent theme flash + register service worker
const initScript = `
(function(){
  // Theme: set data-theme before React hydrates to prevent flash
  try {
    var t = localStorage.getItem('sc-theme') || 'dark';
    var r = t === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : t;
    document.documentElement.setAttribute('data-theme', r);
  } catch(e){}

  // Service Worker: register after page load
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .catch(function(err) { console.warn('SW registration failed:', err); });
    });
  }
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <OfflineBanner />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
