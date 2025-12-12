'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Copy, ShieldCheck, ShieldAlert, MessageSquare } from 'lucide-react';
import { P2PClient } from '@tai/p2p-client';
import ChatSidebar, { ChatMessage } from '@/components/Chat/ChatSidebar';

export default function RoomPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const roomId = params.roomId as string;

    // Read privacy mode from URL
    const privacyModeParam = searchParams.get('privacy');
    const privacyMode = privacyModeParam === 'true';

    // Extract encryption key from hash (for privacy mode)
    const [encryptionKey, setEncryptionKey] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && privacyMode) {
            const hash = window.location.hash.substring(1);
            if (hash) {
                setEncryptionKey(hash);
            }
        }
    }, [privacyMode]);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

    // Chat State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const dataChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const clientRef = useRef<P2PClient | null>(null);

    useEffect(() => {
        // Initialize media
        const startMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                // Initialize P2P Client
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

                console.log('🚀 P2PClient created, checking for onPeerJoined...');
                console.log('📞 P2PClient signalClient type:', typeof client['signalClient']);

                // Handle remote tracks
                (client as any).onTrack = (trackStream: MediaStream, peerId: string) => {
                    console.log('🎥 Received track from peer:', peerId);
                    console.log('🎥 Stream tracks:', trackStream.getTracks());
                    setRemoteStreams(prev => {
                        const newMap = new Map(prev);
                        newMap.set(peerId, trackStream);
                        return newMap;
                    });
                };

                (client as any).onPeerDisconnect = (peerId: string) => {
                    console.log('❌ Peer disconnected:', peerId);
                    setRemoteStreams(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(peerId);
                        return newMap;
                    });
                };

                await client.start(stream);
                clientRef.current = client;

                // DIRECT WEBSOCKET ACCESS TEST (AFTER connection is established)
                const signalClient = (client as any).signalClient;
                if (signalClient && signalClient.ws) {
                    const ws = signalClient.ws;
                    console.log('🔌 Direct WebSocket access successful, readyState:', ws.readyState);

                    // Get OUR public key
                    const myPublicKey = signalClient.getPublicKey();
                    console.log('🔑 My public key:', myPublicKey);

                    // Add our own message listener WITH FULL WebRTC implementation
                    // const peerConnections = new Map<string, RTCPeerConnection>(); // MOVED TO REF
                    const peerPublicKeys = new Map<string, string>(); // Map peer_id -> public_key

                    const originalOnMessage = ws.onmessage;
                    ws.onmessage = async (event: any) => {
                        console.log('🟢 DIRECT onmessage fired!', event.data);

                        // Full WebRTC handling (workaround for module caching)
                        try {
                            const msg = JSON.parse(event.data);

                            if (msg.method === 'peer_joined') {
                                console.log('👋 MANUAL peer_joined handler:', msg.params);
                                const { peer_id, public_key } = msg.params;

                                // Store the mapping
                                peerPublicKeys.set(peer_id, public_key);

                                // Only create offer if we are the "polite" peer (higher peer ID)
                                // This prevents glare (both peers trying to create offers)
                                const myPeerId = (client as any).config.peerId;
                                const shouldCreateOffer = myPeerId > peer_id;

                                if (!shouldCreateOffer) {
                                    console.log('⏸️ Waiting for offer from', peer_id, '(they have lower ID)');
                                    return; // Wait for the other peer to send us an offer
                                }

                                console.log('▶️ Creating offer to', peer_id, '(we have higher ID)');

                                // Create peer connection
                                const pc = new RTCPeerConnection({
                                    iceServers: [{ urls: 'turn:localhost:3478', username: 'username', credential: 'password' }]
                                });

                                // SETUP DATA CHANNEL (OFFERER)
                                const dc = pc.createDataChannel('chat');
                                dc.onopen = () => console.log('💬 Data Channel OPEN (Offerer)');
                                dc.onmessage = (event) => {
                                    try {
                                        const msg = JSON.parse(event.data);
                                        setMessages(prev => [...prev, msg]);
                                    } catch (e) {
                                        console.error('Failed to parse chat message', e);
                                    }
                                };
                                dataChannelsRef.current.set(peer_id, dc);

                                pc.onicecandidate = (e) => {
                                    if (e.candidate) {
                                        console.log('🧊 Sending ICE candidate to', peer_id);
                                        const ice_msg = {
                                            jsonrpc: '2.0',
                                            method: 'relay_message',
                                            params: {
                                                target_peer_id: peer_id,
                                                room_id: roomId,
                                                payload: btoa(JSON.stringify({ type: 'candidate', candidate: e.candidate })),
                                                nonce: btoa('test'),
                                                sender_pubkey: myPublicKey  // USE OUR OWN PUBLIC KEY
                                            }
                                        };
                                        ws.send(JSON.stringify(ice_msg));
                                    }
                                };

                                pc.ontrack = (e) => {
                                    console.log('🎥 Received remote track!', e.streams[0]);
                                    if (e.streams[0]) {
                                        setRemoteStreams(prev => {
                                            const newMap = new Map(prev);
                                            newMap.set(peer_id, e.streams[0]);
                                            return newMap;
                                        });
                                    }
                                };

                                // Add local stream
                                if (localVideoRef.current?.srcObject) {
                                    const localStream = localVideoRef.current.srcObject as MediaStream;
                                    localStream.getTracks().forEach(track => {
                                        pc.addTrack(track, localStream);
                                        console.log('➕ Added local track to peer connection');
                                    });
                                }

                                // Create and send offer
                                pc.createOffer().then(offer => {
                                    pc.setLocalDescription(offer);
                                    console.log('📤 Sending offer to', peer_id);
                                    const offer_msg = {
                                        jsonrpc: '2.0',
                                        method: 'relay_message',
                                        params: {
                                            target_peer_id: peer_id,
                                            room_id: roomId,
                                            payload: btoa(JSON.stringify({ type: 'offer', sdp: offer.sdp })),
                                            nonce: btoa('test'),
                                            sender_pubkey: myPublicKey  // USE OUR OWN PUBLIC KEY
                                        }
                                    };
                                    ws.send(JSON.stringify(offer_msg));
                                });

                                peerConnectionsRef.current.set(peer_id, pc);
                            }

                            // Handle incoming WebRTC messages (offer/answer/candidate)
                            if (msg.method === 'relay_message') {
                                console.log('📨 Received relay_message');
                                try {
                                    const payload_str = atob(msg.params.payload);
                                    const payload = JSON.parse(payload_str);

                                    // Find peer_id from sender_pubkey
                                    let sender_id: string | undefined;
                                    for (const [pid, pkey] of peerPublicKeys.entries()) {
                                        if (pkey === msg.params.sender_pubkey) {
                                            sender_id = pid;
                                            break;
                                        }
                                    }

                                    if (!sender_id) {
                                        console.warn('⚠️ Unknown sender pubkey:', msg.params.sender_pubkey);
                                        return;
                                    }

                                    console.log('📦 Payload type:', payload.type, 'from', sender_id);

                                    let pc = peerConnectionsRef.current.get(sender_id);

                                    // Create PC if we don't have one (we're the answerer)
                                    if (!pc && payload.type === 'offer') {
                                        console.log('🔄 Creating PC as answerer for:', sender_id);
                                        pc = new RTCPeerConnection({
                                            iceServers: [{ urls: 'turn:localhost:3478', username: 'username', credential: 'password' }]
                                        });

                                        // SETUP DATA CHANNEL (ANSWERER)
                                        pc.ondatachannel = (event) => {
                                            const dc = event.channel;
                                            console.log('💬 Data Channel RECEIVED (Answerer)');
                                            dc.onopen = () => console.log('💬 Data Channel OPEN (Answerer)');
                                            dc.onmessage = (e) => {
                                                try {
                                                    const msg = JSON.parse(e.data);
                                                    setMessages(prev => [...prev, msg]);
                                                } catch (err) {
                                                    console.error('Failed to parse chat message', err);
                                                }
                                            };
                                            dataChannelsRef.current.set(sender_id!, dc);
                                        };

                                        pc.onicecandidate = (e) => {
                                            if (e.candidate) {
                                                console.log('🧊 Sending ICE candidate (answerer)');
                                                const ice_msg = {
                                                    jsonrpc: '2.0',
                                                    method: 'relay_message',
                                                    params: {
                                                        target_peer_id: sender_id,
                                                        room_id: roomId,
                                                        payload: btoa(JSON.stringify({ type: 'candidate', candidate: e.candidate })),
                                                        nonce: btoa('test'),
                                                        sender_pubkey: myPublicKey
                                                    }
                                                };
                                                ws.send(JSON.stringify(ice_msg));
                                            }
                                        };

                                        pc.ontrack = (e) => {
                                            console.log('🎥 Received remote track (answerer)!');
                                            if (e.streams[0]) {
                                                setRemoteStreams(prev => {
                                                    const newMap = new Map(prev);
                                                    newMap.set(sender_id, e.streams[0]);
                                                    return newMap;
                                                });
                                            }
                                        };

                                        // Add local stream
                                        if (localVideoRef.current?.srcObject) {
                                            const localStream = localVideoRef.current.srcObject as MediaStream;
                                            localStream.getTracks().forEach(track => {
                                                pc!.addTrack(track, localStream);
                                            });
                                        }

                                        peerConnectionsRef.current.set(sender_id, pc);
                                    }

                                    if (pc) {
                                        if (payload.type === 'offer') {
                                            console.log('🤝 Handling offer');
                                            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: payload.sdp }));
                                            const answer = await pc.createAnswer();
                                            await pc.setLocalDescription(answer);
                                            const answer_msg = {
                                                jsonrpc: '2.0',
                                                method: 'relay_message',
                                                params: {
                                                    target_peer_id: sender_id,
                                                    room_id: roomId,
                                                    payload: btoa(JSON.stringify({ type: 'answer', sdp: answer.sdp })),
                                                    nonce: btoa('test'),
                                                    sender_pubkey: myPublicKey
                                                }
                                            };
                                            ws.send(JSON.stringify(answer_msg));
                                        } else if (payload.type === 'answer') {
                                            console.log('🤝 Handling answer');
                                            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: payload.sdp }));
                                        } else if (payload.type === 'candidate') {
                                            console.log('🧊 Handling ICE candidate');
                                            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                                        }
                                    }
                                } catch (e) {
                                    console.error('Failed to handle relay_message:', e);
                                }
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }

                        if (originalOnMessage) {
                            originalOnMessage.call(ws, event);
                        }
                    };
                } else {
                    console.error('❌ Could not access WebSocket after connection!');
                }

                console.log('Media started for room:', roomId);
            } catch (err) {
                console.error('Failed to get media:', err);
            }
        };

        startMedia();

        return () => {
            // Cleanup media
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

    const copyLink = () => {
        const baseUrl = window.location.origin;
        let url = `${baseUrl}/room/${roomId}?privacy=${privacyMode}`;
        if (privacyMode && encryptionKey) {
            url += `#${encryptionKey}`;
        }
        navigator.clipboard.writeText(url);
        alert('Meeting link copied!');
    };

    // Chat Handlers
    const handleSendMessage = (text: string) => {
        const msg: ChatMessage = {
            id: crypto.randomUUID(),
            senderId: (clientRef.current as any)?.config.peerId || 'me',
            timestamp: Date.now(),
            type: 'text',
            content: text
        };
        setMessages(prev => [...prev, msg]);
        broadcastMessage(msg);
    };

    const handleSendFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            const msg: ChatMessage = {
                id: crypto.randomUUID(),
                senderId: (clientRef.current as any)?.config.peerId || 'me',
                timestamp: Date.now(),
                type: file.type.startsWith('image/') ? 'image' : 'file',
                content: reader.result as string,
                metadata: {
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType: file.type
                }
            };
            setMessages(prev => [...prev, msg]);
            broadcastMessage(msg);
        };
        reader.readAsDataURL(file);
    };

    const handleSendLocation = () => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(position => {
                const msg: ChatMessage = {
                    id: crypto.randomUUID(),
                    senderId: (clientRef.current as any)?.config.peerId || 'me',
                    timestamp: Date.now(),
                    type: 'location',
                    content: 'Shared Location',
                    metadata: {
                        coordinates: {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        }
                    }
                };
                setMessages(prev => [...prev, msg]);
                broadcastMessage(msg);
            });
        }
    };

    const broadcastMessage = (msg: ChatMessage) => {
        const msgStr = JSON.stringify(msg);
        dataChannelsRef.current.forEach(dc => {
            if (dc.readyState === 'open') {
                dc.send(msgStr);
            }
        });
    };

    return (
        <div className="h-screen bg-neutral-950 flex flex-col">
            {/* Top Bar */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-neutral-900/50 backdrop-blur">
                <div className="flex items-center gap-3">
                    {privacyMode ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-400 text-xs font-medium">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Privacy Mode ON (E2EE)</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-medium">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Standard Mode (Fast)</span>
                        </div>
                    )}
                    <span className="text-neutral-400 text-sm font-mono">{roomId.slice(0, 8)}...</span>
                </div>

                <button
                    onClick={copyLink}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-lg text-sm text-neutral-300 transition-colors"
                >
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                </button>
            </div>

            {/* Video Grid */}
            <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
                {/* Local Video */}
                <div className="relative aspect-video bg-neutral-900 rounded-2xl overflow-hidden border border-white/5 shadow-2xl ring-1 ring-white/10 group">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                    <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded-lg text-sm font-medium">
                        You {isMuted && '(Muted)'}
                    </div>
                </div>

                {/* Remote Peers */}
                {Array.from(remoteStreams.entries()).map(([peerId, stream]: [string, MediaStream]) => (
                    <div key={peerId} className="relative aspect-video bg-neutral-800 rounded-2xl overflow-hidden border border-white/5">
                        <video
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                            ref={el => {
                                if (el) el.srcObject = stream;
                            }}
                        />
                        <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded-lg text-sm font-medium">
                            Guest {peerId.slice(0, 4)}
                        </div>
                    </div>
                ))}
            </div>

            {/* Controls Bar */}
            <div className="h-20 border-t border-white/10 bg-neutral-900/80 backdrop-blur flex items-center justify-center gap-4 relative z-50">
                <button
                    onClick={toggleMute}
                    className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-neutral-800 hover:bg-neutral-700 text-white'}`}
                >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-full transition-all ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-neutral-800 hover:bg-neutral-700 text-white'}`}
                >
                    {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>

                <button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className={`p-4 rounded-full transition-all ${isChatOpen ? 'bg-blue-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-white'}`}
                >
                    <MessageSquare className="w-6 h-6" />
                </button>

                <button
                    onClick={() => window.location.href = '/'}
                    className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all ml-4"
                >
                    <PhoneOff className="w-6 h-6" />
                </button>
            </div>

            <ChatSidebar
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                messages={messages}
                onSendMessage={handleSendMessage}
                onSendFile={handleSendFile}
                onSendLocation={handleSendLocation}
                myPeerId={(clientRef.current as any)?.config.peerId || 'me'}
            />
        </div>
    );
}
