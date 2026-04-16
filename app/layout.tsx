import './globals.css'

export const metadata = {
  title: 'A20 App',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head />
      <body>
        {children}
      </body>
    </html>
  )
}
