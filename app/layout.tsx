import { Plus_Jakarta_Sans, Outfit, Sacramento, Tangerine } from "next/font/google";
import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Faith App by RCCGDC",
  description: "Faith app by RCCGDC for church members, events, and community engagement.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Faith",
  },
};

export const viewport: Viewport = {
  themeColor: "#121212",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};
const headingFont = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"], // Bold weights for titles
});

const bodyFont = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500"], // Regular and Medium for info
});

const scriptFont = Sacramento({
  variable: "--font-script",
  subsets: ["latin"],
  weight: "400",
});

const logoFont = Tangerine({
  variable: "--font-tangerine",
  subsets: ["latin"],
  weight: ["400", "700"],
});



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable} ${scriptFont.variable} ${logoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full font-body bg-slate-50 text-slate-900 w-full mx-auto">
        {children}
      </body>
    </html>
  );
}