import type { ReactNode } from "react";

export const metadata = { title: "Jev vs. LLM", description: "Sort one bank customer message with Jev and with LLMs, side by side." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f4f6f8", color: "#18212b" }}>
        {children}
      </body>
    </html>
  );
}
