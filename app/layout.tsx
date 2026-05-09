import { Inter, Source_Serif_4, JetBrains_Mono } from 'next/font/google'
import { AuthProvider } from '@/lib/contexts/auth-context'
import { GenerationProvider } from '@/lib/contexts/generation-context'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata = {
  title: 'Synapsy',
  description: 'Biến tài liệu thành flashcard thông minh với AI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}>
      <body>
        <AuthProvider>
          <GenerationProvider>
            {children}
          </GenerationProvider>
        </AuthProvider>
        <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js" defer />
      </body>
    </html>
  )
}
