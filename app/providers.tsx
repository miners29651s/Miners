"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TonConnectUIProvider manifestUrl="/tonconnect-manifest.json">
      <ConvexProvider client={convex}>{children}</ConvexProvider>
    </TonConnectUIProvider>
  );
}
