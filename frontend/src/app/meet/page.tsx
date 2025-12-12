'use client';

import { ConnectButton, useCurrentAccount, useWallets, useConnectWallet } from '@mysten/dapp-kit';
import { Video, Users, Shield, ArrowRight, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { isEnokiWallet } from '@mysten/enoki';

export default function Home() {
  const account = useCurrentAccount();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const { mutate: connect } = useConnectWallet();
  const wallets = useWallets();

  // Get Google wallet from Enoki
  const googleWallet = useMemo(() => {
    return wallets.find(wallet => isEnokiWallet(wallet) && wallet.name.toLowerCase().includes('google'));
  }, [wallets]);

  const handleCreateRoom = () => {
    if (!account) return;
    setIsCreating(true);

    // Generate a unique room ID
    const roomId = crypto.randomUUID();

    // Generate encryption key only for Privacy Mode
    let url = `/room/${roomId}`;
    if (privacyMode) {
      const encryptionKey = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      url += `?privacy=true#${encryptionKey}`;
    } else {
      url += '?privacy=false';
    }

    router.push(url);
  };

  const handleGoogleLogin = async () => {
    if (googleWallet) {
      try {
        await connect({ wallet: googleWallet });
      } catch (error: any) {
        console.error('Login failed:', error);
        alert('Login failed: ' + (error?.message || 'Unknown error'));
      }
    } else {
      console.error('❌ Google wallet not found!');
      alert('Google wallet not available. Please refresh the page.');
    }
  };

  const isLoggedIn = !!account;

  // Privacy Mode State
  const [privacyMode, setPrivacyMode] = useState(false);

  const [guestRoomInput, setGuestRoomInput] = useState('');

  const handleGuestJoin = () => {
    if (!guestRoomInput.trim()) return;

    try {
      // Try to parse as full URL
      if (guestRoomInput.includes('room/')) {
        const url = new URL(guestRoomInput.startsWith('http') ? guestRoomInput : `http://localhost${guestRoomInput}`);
        const pathParts = url.pathname.split('/');
        const roomId = pathParts[pathParts.indexOf('room') + 1];
        const privacy = url.searchParams.get('privacy') === 'true';
        const encKey = url.hash.substring(1);

        let targetUrl = `/room/${roomId}?privacy=${privacy}`;
        if (encKey) targetUrl += `#${encKey}`;

        router.push(targetUrl);
      } else {
        // Treat as plain room ID
        router.push(`/room/${guestRoomInput.trim()}?privacy=false`);
      }
    } catch (e) {
      // If parsing fails, treat as room ID
      router.push(`/room/${guestRoomInput.trim()}?privacy=false`);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white selection:bg-rose-500/30">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-md">
              <img src="/IMG_2262.png" alt="Tai Meet" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-xl tracking-tight">Tai Meet</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Privacy Toggle */}
            <button
              onClick={() => setPrivacyMode(!privacyMode)}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm font-medium",
                privacyMode
                  ? "bg-rose-500/10 border-rose-500/50 text-rose-400"
                  : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
              )}
            >
              <Shield className="w-4 h-4" />
              <span>{privacyMode ? 'Privacy Mode ON' : 'Privacy Mode OFF'}</span>
            </button>

            <ConnectButton className="!bg-white/10 !text-white hover:!bg-white/20 !font-medium !px-4 !py-2 !rounded-lg !transition-all" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-20 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium mb-8">
          <Shield className="w-4 h-4" />
          <span>End-to-End Encrypted & Decentralized</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50 mb-6 tracking-tight">
          Private Video Meetings<br />
          <span className="text-white">Powered by Sui</span>
        </h1>

        <p className="text-lg text-neutral-400 max-w-2xl mb-12 leading-relaxed">
          No sign-ups, no tracking, no central servers.
          Just secure P2P video calls powered by the Tai network.
        </p>

        <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
          {/* Host Card */}
          <div className="group relative p-8 rounded-2xl bg-neutral-900/50 border border-white/10 hover:border-rose-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-500/10 text-left">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-12 h-12 bg-rose-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6 text-rose-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Launch Meeting</h2>
              <p className="text-neutral-400 mb-8">
                Start a new private room. Connect wallet or sign in with Google to sponsor bandwidth.
              </p>

              {isLoggedIn ? (
                <button
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                  className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isCreating ? 'Creating...' : 'Start Instant Meeting'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full py-3 px-4 bg-white text-black hover:bg-neutral-200 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign in with Google
                  </button>
                  <div className="text-center text-xs text-neutral-500">
                    OR connect wallet above
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Guest Card */}
          <div className="group relative p-8 rounded-2xl bg-neutral-900/50 border border-white/10 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 text-left">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Join Meeting</h2>
              <p className="text-neutral-400 mb-8">
                Have a code? Enter it below to join an existing room anonymously.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={guestRoomInput}
                  onChange={(e) => setGuestRoomInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGuestJoin()}
                  placeholder="Paste room link or ID"
                  className="flex-1 bg-neutral-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  onClick={handleGuestJoin}
                  className="px-6 bg-neutral-800 hover:bg-blue-600 hover:text-white text-neutral-300 rounded-xl font-medium transition-all"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
