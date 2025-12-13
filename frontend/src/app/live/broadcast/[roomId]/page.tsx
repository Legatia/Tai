'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import LiveChat from '@/components/Live/LiveChat';
import { PredictionWidget } from '@/components/Prediction';
import { User, Share2, Settings, Users, Eye, Copy, Radio, VideoOff, MicOff, Mic, Video, X } from 'lucide-react';
import { P2PClient } from '@tai/p2p-client';

export default function BroadcastPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const roomId = params.roomId as string;
    const privacyMode = searchParams.get('privacy') === 'true';

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [viewerCount, setViewerCount] = useState(0);
    const [streamDuration, setStreamDuration] = useState(0);
    const [isEnding, setIsEnding] = useState(false);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const clientRef = useRef<P2PClient | null>(null);
    const startTimeRef = useRef<number>(Date.now());

    // Mock streamer data
    const streamer = {
        name: 'CryptoStreamer',
        address: '0x2ce41c43a6ee1192adc2fe6cc620eef80ca4f57940a5c6cc2d51664514616c14',
        avatar: '/IMG_2262.png',
    };

    useEffect(() => {
        // Initialize media
        const startMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                // Initialize P2P Client for broadcasting
                const client = new P2PClient({
                    signalingUrl: 'ws://localhost:8080',
                    roomId: roomId,
                    peerId: crypto.randomUUID(),
                    turnServers: [
                        {
                            urls: 'turn:localhost:3478',
                            username: 'username',
                            credential: 'password'
                        }
                    ],
                    privacyMode: privacyMode
                });

                await client.start(stream);
                clientRef.current = client;

                console.log('📡 Broadcasting started for room:', roomId);
            } catch (err) {
                console.error('Failed to start broadcast:', err);
            }
        };

        startMedia();

        // Stream duration timer
        const timer = setInterval(() => {
            setStreamDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);

        // Mock viewer count updates
        const viewerTimer = setInterval(() => {
            setViewerCount(prev => prev + Math.floor(Math.random() * 3));
        }, 5000);

        return () => {
            clearInterval(timer);
            clearInterval(viewerTimer);
            if (localVideoRef.current?.srcObject) {
                const stream = localVideoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
            clientRef.current?.destroy();
        };
    }, [roomId, privacyMode]);

    const toggleMute = () => {
        if (localVideoRef.current?.srcObject) {
            const stream = localVideoRef.current.srcObject as MediaStream;
            stream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localVideoRef.current?.srcObject) {
            const stream = localVideoRef.current.srcObject as MediaStream;
            stream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
            setIsVideoOff(!isVideoOff);
        }
    };

    const copyShareLink = () => {
        const url = `${window.location.origin}/live/stream/${roomId}`;
        navigator.clipboard.writeText(url);
        alert('Stream link copied! Share with your viewers.');
    };

    const endStream = () => {
        setIsEnding(true);
        if (localVideoRef.current?.srcObject) {
            const stream = localVideoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
        clientRef.current?.destroy();
        window.location.href = '/live/dashboard';
    };

    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return hrs > 0
            ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
            : `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex h-[calc(100vh-5rem)] overflow-hidden">
            {/* Main Content (Video + Info) */}
            <div className="flex-1 flex flex-col overflow-y-auto bg-neutral-950">
                {/* Video Container */}
                <div className="w-full bg-black aspect-video max-h-[70vh] relative">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />

                    {/* Live Indicator Overlay */}
                    <div className="absolute top-4 left-4 flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600 rounded-lg">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            <span className="text-white text-sm font-bold">LIVE</span>
                        </div>
                        <div className="px-3 py-1.5 bg-black/60 backdrop-blur rounded-lg text-white text-sm font-mono">
                            {formatDuration(streamDuration)}
                        </div>
                    </div>

                    {/* Viewer Count Overlay */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur rounded-lg">
                        <Eye className="w-4 h-4 text-red-400" />
                        <span className="text-white text-sm font-medium">{viewerCount}</span>
                    </div>

                    {/* Controls Overlay */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 bg-black/60 backdrop-blur rounded-xl">
                        <button
                            onClick={toggleMute}
                            className={`p-3 rounded-lg transition-all ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                        >
                            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={toggleVideo}
                            className={`p-3 rounded-lg transition-all ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                        >
                            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={copyShareLink}
                            className="p-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                        >
                            <Share2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={endStream}
                            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-all flex items-center gap-2"
                        >
                            <X className="w-4 h-4" />
                            End Stream
                        </button>
                    </div>
                </div>

                {/* Stream Info */}
                <div className="p-6">
                    <div className="flex justify-between items-start gap-6">
                        <div className="flex gap-4 flex-1">
                            {/* Avatar */}
                            <div className="relative">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full p-0.5">
                                    <div className="w-full h-full bg-neutral-900 rounded-full overflow-hidden border-2 border-neutral-950">
                                        <img src={streamer.avatar} alt={streamer.name} className="w-full h-full object-cover" />
                                    </div>
                                </div>
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded uppercase tracking-wider border-2 border-neutral-950">
                                    Live
                                </div>
                            </div>

                            {/* Text Info */}
                            <div>
                                <h1 className="text-2xl font-bold text-white mb-1">Building the Future of Decentralized Streaming</h1>
                                <div className="flex items-center gap-2 text-neutral-400 text-sm mb-3">
                                    <span className="text-purple-400 font-medium">{streamer.name}</span>
                                    <span>•</span>
                                    <span>Just Chatting</span>
                                    <span>•</span>
                                    <div className="flex gap-1">
                                        <span className="px-2 py-0.5 bg-white/5 rounded-full text-xs">Web3</span>
                                        <span className="px-2 py-0.5 bg-white/5 rounded-full text-xs">Sui</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Share Link */}
                        <div className="flex items-center gap-2">
                            <div className="px-4 py-2 bg-neutral-800 rounded-lg text-neutral-400 text-sm font-mono truncate max-w-xs">
                                tai.gg/live/{roomId.slice(0, 8)}...
                            </div>
                            <button
                                onClick={copyShareLink}
                                className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                            >
                                <Copy className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Prediction Widget - Host Mode */}
                    <div className="mt-6">
                        <PredictionWidget roomId={roomId} />
                    </div>

                    {/* Stream Stats */}
                    <div className="mt-8 grid grid-cols-4 gap-4">
                        <div className="p-4 bg-neutral-900/50 rounded-xl border border-white/5">
                            <p className="text-neutral-500 text-sm mb-1">Viewers</p>
                            <p className="text-2xl font-bold text-white">{viewerCount}</p>
                        </div>
                        <div className="p-4 bg-neutral-900/50 rounded-xl border border-white/5">
                            <p className="text-neutral-500 text-sm mb-1">Duration</p>
                            <p className="text-2xl font-bold text-white">{formatDuration(streamDuration)}</p>
                        </div>
                        <div className="p-4 bg-neutral-900/50 rounded-xl border border-white/5">
                            <p className="text-neutral-500 text-sm mb-1">Tips Received</p>
                            <p className="text-2xl font-bold text-emerald-400">0 SUI</p>
                        </div>
                        <div className="p-4 bg-neutral-900/50 rounded-xl border border-white/5">
                            <p className="text-neutral-500 text-sm mb-1">Predictions</p>
                            <p className="text-2xl font-bold text-purple-400">0</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Sidebar */}
            <div className="w-80 hidden lg:block h-full border-l border-white/5">
                <LiveChat />
            </div>
        </div>
    );
}
