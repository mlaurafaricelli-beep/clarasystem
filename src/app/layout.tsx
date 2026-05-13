import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ClaraSystem — CRM para dueñas de agencias',
  description: 'Tablero, aprobaciones, fichas, alertas y registro de acuerdos.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{children}</body>
    </html>
  )
}
