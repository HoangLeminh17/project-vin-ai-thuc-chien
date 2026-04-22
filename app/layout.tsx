import { AuthProvider } from '@/lib/contexts/auth-context'
import './globals.css'

export const metadata = {
  title: 'A20 App',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head />
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        {/* defer ensures the script loads after HTML is parsed */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js" defer />
      </body>
    </html>
  )
}
