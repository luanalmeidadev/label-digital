import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administração",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function AdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
