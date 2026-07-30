import type { ReactNode } from 'react'
import '../src/index.css'
import '../src/App.css'
import '../src/status.css'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
