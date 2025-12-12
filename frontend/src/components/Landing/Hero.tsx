'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, Video, Radio } from 'lucide-react';
import Link from 'next/link';

export default function Hero() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setStatus('loading');

        try {
            const res = await fetch('http://localhost:3001/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (res.ok) {
                setStatus('success');
                setEmail('');
            } else {
                console.error('Failed to join waitlist');
                setStatus('idle'); // Reset on error so they can try again
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            setStatus('idle');
        }
    };

    return (
        <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-purple-300 mb-8 animate-fade-in">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                        </span>
                        Tai Meet is now live
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-8 leading-tight">
                        The Streaming Hub Built with <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
                            Creator Ownership
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-xl text-neutral-400 mb-12 max-w-2xl leading-relaxed">
                        Streaming with economic physics baked into the substrate.
                        Built on <span className="text-white font-medium">Sui</span> + <span className="text-white font-medium">Walrus</span> + <span className="text-white font-medium">P2P</span>.
                        Own your content, your audience, and your revenue.
                    </p>

                    {/* CTA / Waitlist */}
                    <div className="w-full max-w-md mb-16">
                        {status === 'success' ? (
                            <div className="flex items-center justify-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="font-medium">You're on the list! We'll be in touch.</span>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="Enter your email for early access"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
                                    {!status && <ArrowRight className="w-4 h-4" />}
                                </button>
                            </form>
                        )}
                        <p className="text-xs text-neutral-500 mt-3">
                            Join 2,000+ others waiting for the beta. No spam, ever.
                        </p>
                    </div>

                    {/* Product Cards */}
                    <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl text-left">
                        <Link href="/meet" className="group p-6 rounded-2xl bg-neutral-900/50 border border-white/5 hover:border-purple-500/30 hover:bg-neutral-900 transition-all">
                            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Video className="w-6 h-6 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                                Tai Meet
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Live</span>
                            </h3>
                            <p className="text-neutral-400 text-sm">
                                Secure P2P video meetings with end-to-end encryption. No servers, no tracking.
                            </p>
                        </Link>

                        <Link href="/live" className="group p-6 rounded-2xl bg-neutral-900/50 border border-white/5 hover:border-blue-500/30 hover:bg-neutral-900 transition-all">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Radio className="w-6 h-6 text-blue-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                                Tai Live
                                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-neutral-400 border border-white/10">Coming Soon</span>
                            </h3>
                            <p className="text-neutral-400 text-sm">
                                The next generation of livestreaming. Earn from every minute watched.
                            </p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
