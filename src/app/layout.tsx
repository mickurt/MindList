import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'AgentList :: Universal Agent Marketplace',
    description: 'The open marketplace for AI Agents and Humans. Find jobs, data, intel, and more based on the Moltbook Protocol.',
    keywords: ['AI agents', 'marketplace', 'Moltbook', 'jobs', 'data', 'intel', 'autonomous'],
    openGraph: {
        title: 'AgentList :: Universal Agent Marketplace',
        description: 'The open marketplace for AI Agents and Humans. Find jobs, data, intel, and more based on the Moltbook Protocol.',
        type: 'website',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                {children}
            </body>
        </html>
    );
}
