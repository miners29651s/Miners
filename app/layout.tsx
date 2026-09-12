import { Providers } from "./providers";
import "./globals.css";

export const metadata = { title: "Miner Coffee" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="/telegram-web-app.js" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
