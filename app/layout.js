import "./globals.css";
import Header from "./Header";

export const metadata = {
  title: "MojMeštar",
  description: "Pronađi lokalne majstore u Hrvatskoj."
};

export default function RootLayout({ children }) {
  return (
    <html lang="hr">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
