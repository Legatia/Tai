'use client';

import Link from 'next/link';
import { Video, Radio, Users } from 'lucide-react';
import WalletConnect from '@/components/Wallet/WalletConnect';

export default function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-neutral-950/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
                        <img src="/IMG_2262.png" alt="Tai Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-white">Tai</span>
                </Link>

                {/* Navigation */}
                <div className="flex items-center gap-6">
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

                    <div className="h-6 w-px bg-white/10" />

                    {/* Become Contributor */}
                    <a
                        href="https://github.com/Legatia/Tai/tree/main/node-operator-cli"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                    >
                        <Users className="w-4 h-4" />
                        <span>Become Contributor</span>
                    </a>

                    <div className="h-6 w-px bg-white/10" />

                    {/* Wallet Connect */}
                    <WalletConnect />
                </div>
            </div>
        </nav>
    );
}

