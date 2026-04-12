import './globals.css'

export const metadata = {
  title: 'A20 App',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        {/* Reveal.js — loaded globally so RevealDeck component can use window.Reveal */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/theme/simple.css"
        />
      </head>
      <body>
        {children}
        {/* defer ensures the script loads after HTML is parsed */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js" defer />
      </body>
    </html>
  )
}
