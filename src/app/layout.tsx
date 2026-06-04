import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SV-App',
  description: 'Organisationsapp für die Schülervertretung',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  )
}
