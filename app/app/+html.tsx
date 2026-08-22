import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Shelfd — Your Personal Library & Series Companion</title>
        <ScrollViewStyleReset />
      </head>
      <body style={{ backgroundColor: '#0f172a' }}>{children}</body>
    </html>
  );
}
