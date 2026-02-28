import './globals.css'

export const metadata = {
  metadataBase: new URL('https://wetask-two.vercel.app'),
  title: 'We TASK - チームの雑務を見える化するボード',
  description: 'チーム8人の雑務管理ボード。固定担当・ローテーション・フレキシブルの3パターンで雑務を見える化。',
  openGraph: {
    title: 'We TASK',
    description: 'チームの雑務を見える化するボード',
    images: ['/ogp.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'We TASK',
    description: 'チームの雑務を見える化するボード',
    images: ['/ogp.png'],
  },
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
