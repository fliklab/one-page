import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import './globals.css';
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="ko" suppressHydrationWarning><body><RootProvider search={{enabled: false}}>{children}</RootProvider></body></html>;
}
