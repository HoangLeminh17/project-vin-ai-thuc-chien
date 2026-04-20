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
      </body>
    </html>
  )
}
