import '@/styles/globals.scss'

export const metadata = {
  title: 'OuraGo — Order Direct',
  description: 'Order directly from your favourite restaurant in Qatar.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}