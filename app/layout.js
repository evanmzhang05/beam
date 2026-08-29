export const metadata = {
  title: "Job Bot",
  description: "Daily job matches, delivered to your inbox.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f7f7f8", fontFamily: "-apple-system, Helvetica, Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
