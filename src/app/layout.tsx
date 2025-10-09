import "./globals.css";

export const metadata = {
  title: "Vidicruit",
  description: "Video CV + AI job matching",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
