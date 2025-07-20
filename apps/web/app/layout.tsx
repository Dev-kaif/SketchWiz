import type { Metadata } from "next";
import "./globals.css";
// import '@repo/ui/styles.css'
import { NotificationProvider } from "../Component/notification/notification";

export const metadata: Metadata = {
  title: "SketchWiz",
  description: "AI Powered Canvas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {


  return (
    <html lang="en">
      <body className={`text-white `}>
      <NotificationProvider>
        {children}
      </NotificationProvider>
      </body>
    </html>
  );
}
