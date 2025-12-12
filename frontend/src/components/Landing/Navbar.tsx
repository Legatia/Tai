'use client';

import Link from 'next/link';
import { Video, Radio } from 'lucide-react';
import WalletConnect from '@/components/Wallet/WalletConnect';

export default function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-neutral-950/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg shadow-purple-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" /></svg>
                    </div>
                    <span className="font-bold text-xl tracking-tight text-white">Tai</span>
                </Link>

                {/* Navigation */}
                <div className="flex items-center gap-8">
                    <Link
                        href="/meet"
                        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm font-medium"
                    >
                        <Video className="w-4 h-4" />
                        <span>Meet</span>
                    </Link>
                    <Link
                        href="/live"
                        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm font-medium"
                    >
                        <Radio className="w-4 h-4" />
                        <span>Live</span>
                    </Link>

                    <div className="h-6 w-px bg-white/10 mx-2" />

                    {/* Wallet Connect */}
                    <WalletConnect />
                </div>
            </div>
        </nav>
    );
}
