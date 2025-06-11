import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: 'Badminton Scoring Software',
  description: 'Created with v0',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
