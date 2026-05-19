import { DM_Sans, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler'
import { Providers } from '@/components/providers'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' })
const jakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return {
    title: 'Condomínio Águas Férreas - Gestão',
    description: 'Sistema de gestão do Condomínio Águas Férreas',
    metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
    icons: {
      icon: '/favicon.svg',
      shortcut: '/favicon.svg',
    },
    openGraph: {
      title: 'Condomínio Águas Férreas - Gestão',
      description: 'Sistema de gestão do Condomínio Águas Férreas',
      images: ['/og-image.png'],
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>
      <body className={`${dmSans.variable} ${jakartaSans.variable} ${jetbrainsMono.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            {children}
            <Toaster />
            <ChunkLoadErrorHandler />
          </Providers>
        </ThemeProvider>

        {/* <footer style={{ fontSize: 12, opacity: 0.6, padding: "12px 16px", borderTop: "1px solid #eee" }}>
          Condomínio Águas Férreas — v{process.env.NEXT_PUBLIC_APP_VERSION}
        </footer> */}

        <footer style={{ fontSize: 12, opacity: 0.6 }}>  FOOTER OK — versão: {String(process.env.NEXT_PUBLIC_APP_VERSION)}</footer>

      </body>
    </html>
  )
}
