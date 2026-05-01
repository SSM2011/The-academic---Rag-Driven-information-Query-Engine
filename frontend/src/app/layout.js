import './globals.css';

export const metadata = {
  title: 'KnowledgeVault — College RAG System',
  description: 'AI-powered academic knowledge management system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}
