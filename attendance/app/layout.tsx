import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Blossom • Attendance",
  description:
    "Blossom Kindergarten School — fictional attendance demonstration",
  icons: { icon: "/blossom-approved.png" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
