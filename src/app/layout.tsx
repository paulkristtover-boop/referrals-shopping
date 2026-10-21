import type { Metadata } from 'next'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Referrals Shopping – Promote & Earn',
  description: 'Get real referrals for your shopping platforms and affiliate programs. Promote your links or earn by completing tasks.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="d-flex flex-column min-vh-100">
        <ThemeProvider>
          <Navbar />
          <main className="flex-grow-1 py-4">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
