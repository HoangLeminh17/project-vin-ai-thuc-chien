import { AuthProvider } from '@/lib/contexts/auth-context'
import { GenerationProvider } from '@/lib/contexts/generation-context'
import './globals.css'

export const metadata = {
  title: 'Synapsy',
  description: 'Biến tài liệu thành flashcard thông minh với AI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300..900;1,8..60,300..900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <GenerationProvider>
            {children}
          </GenerationProvider>
        </AuthProvider>
        {/* defer ensures the script loads after HTML is parsed */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js" defer />
      </body>
    </html>
  )
}
