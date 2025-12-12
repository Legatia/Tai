'use client';

import { useState } from 'react';
import { Copy, Eye, EyeOff, Radio, Settings, Activity, Users, DollarSign } from 'lucide-react';

export default function DashboardPage() {
    const [showKey, setShowKey] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const [streamKey] = useState('live_54321_AbCdEfGhIjKlMnOpQrStUvWxYz');

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // In a real app, we'd show a toast here
    };

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Creator Dashboard</h1>
                    <p className="text-neutral-400">Manage your stream, analytics, and earnings.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${isLive ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-neutral-800 text-neutral-400 border border-white/5'}`}>
                        <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-neutral-500'}`} />
                        {isLive ? 'Live Now' : 'Offline'}
                    </div>
                    <button
                        onClick={() => setIsLive(!isLive)}
                        className={`px-6 py-2 rounded-xl font-semibold transition-all ${isLive
                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20'
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20'
                            }`}
                    >
                        {isLive ? 'End Stream' : 'Go Live'}
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Total Views', value: '12.5k', change: '+12%', icon: Eye, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                    { label: 'Followers', value: '843', change: '+5%', icon: Users, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                    { label: 'Earnings', value: '450 TAI', change: '+8%', icon: DollarSign, color: 'text-green-400', bg: 'bg-green-400/10' },
                    { label: 'Stream Health', value: 'Excellent', change: 'Stable', icon: Activity, color: 'text-orange-400', bg: 'bg-orange-400/10' },
                ].map((stat) => (
                    <div key={stat.label} className="p-6 bg-neutral-900/50 border border-white/5 rounded-2xl">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg}`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-lg">
                                {stat.change}
                            </span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
                        <p className="text-sm text-neutral-400">{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stream Settings */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="p-6 bg-neutral-900/50 border border-white/5 rounded-2xl">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Radio className="w-5 h-5 text-purple-400" />
                            Stream Configuration
                        </h2>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-2">Stream Title</label>
                                <input
                                    type="text"
                                    defaultValue="Building the Future of Decentralized Streaming"
                                    className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-2">Category</label>
                                <select className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all">
                                    <option>Just Chatting</option>
                                    <option>Gaming</option>
                                    <option>Coding</option>
                                    <option>Crypto</option>
                                </select>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-2">Stream Server URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value="rtmp://ingest.tai.io/live"
                                            readOnly
                                            className="flex-1 bg-neutral-950 border border-white/10 rounded-xl px-4 py-3 text-neutral-400 font-mono text-sm"
                                        />
                                        <button
                                            onClick={() => copyToClipboard('rtmp://ingest.tai.io/live')}
                                            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors"
                                        >
                                            <Copy className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-2">Stream Key</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 relative">
                                            <input
                                                type={showKey ? "text" : "password"}
                                                value={streamKey}
                                                readOnly
                                                className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-3 text-neutral-400 font-mono text-sm"
                                            />
                                            <button
                                                onClick={() => setShowKey(!showKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                                            >
                                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(streamKey)}
                                            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors"
                                        >
                                            <Copy className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions / Guide */}
                <div className="space-y-6">
                    <div className="p-6 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">Quick Start Guide</h3>
                        <ol className="space-y-4 text-sm text-neutral-300 list-decimal list-inside">
                            <li>Copy your <strong>Stream Key</strong></li>
                            <li>Open OBS Studio or Streamlabs</li>
                            <li>Go to Settings {'>'} Stream</li>
                            <li>Select "Custom" service</li>
                            <li>Paste Server URL and Stream Key</li>
                            <li>Start Streaming!</li>
                        </ol>
                    </div>

                    <div className="p-6 bg-neutral-900/50 border border-white/5 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-neutral-400" />
                            Stream Quality
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-neutral-400">Resolution</span>
                                <span className="text-white font-medium">1080p 60fps</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-neutral-400">Bitrate</span>
                                <span className="text-white font-medium">6000 Kbps</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-neutral-400">Latency</span>
                                <span className="text-green-400 font-medium">Low (P2P)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
