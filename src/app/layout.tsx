import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ExitExam Prep — University Examination Platform',
  description: 'A web-based university examination preparation platform for Exit Exams and Course Exams.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
