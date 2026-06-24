export const metadata = {
  title: "乗り打ち収支",
  description: "古川・中嶋・坂本の乗り打ち収支管理",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
