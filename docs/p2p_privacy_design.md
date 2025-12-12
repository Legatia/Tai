# P2P Privacy Layer Design

## Overview

This document details the technical architecture for Tai's **Private Video Meeting** feature (Phase 2). The goal is to achieve "Highest Possible Privacy" by eliminating third-party trust and minimizing metadata leakage.

## Core Principles

1.  **UX First (Default):** By default, meetings prioritize low latency and high quality using standard WebRTC (DTLS-SRTP) and direct P2P connections (STUN).
2.  **Privacy Mode (Opt-in):** Users can toggle "Privacy Mode" to enable:
    *   **E2EE:** Media encrypted at application layer (Insertable Streams).
    *   **Hidden IPs:** Traffic forced through TURN relays.
3.  **Encrypted Signaling:** Signaling is *always* encrypted to protect metadata, regardless of the media mode.
4.  **No Persistent Metadata:** Signaling is ephemeral. No session logs stored on-chain or on nodes.

---

## 1. Architecture

```mermaid
graph TD
    A[User A (Streamer)] -->|E2EE Media (SRTP+Insertable)| TURN[Node Operator (TURN)]
    TURN -->|E2EE Media (SRTP+Insertable)| B[User B (Viewer)]
    
    A -->|E2EE Signaling (WebSocket)| RELAY[Node Operator (Signal Relay)]
    RELAY -->|E2EE Signaling (WebSocket)| B
    
    subgraph "Client A"
        A_Key[Key Generation]
        A_Encrypt[Frame Encryption]
    end
    
    subgraph "Client B"
        B_Key[Key Generation]
        B_Decrypt[Frame Decryption]
    end
```

---

## 2. Signaling Protocol

We will use a **blind relay** approach. The Node Operator runs a WebSocket server that simply forwards messages between `room_id` participants without being able to read them.

### Transport
- **WebSocket (WSS)** secured by TLS.
- **Protocol:** JSON-RPC 2.0.

### Message Structure (Outer Layer - Visible to Node)
The Node needs to know *where* to send the message, but not *what* is in it.

```json
{
  "jsonrpc": "2.0",
  "method": "relay_message",
  "params": {
    "target_peer_id": "0x123...", 
    "room_id": "0xRoomID...",
    "payload": "<ENCRYPTED_BLOB>" 
  },
  "id": 1
}
```

### Message Structure (Inner Layer - Encrypted)
Inside the `payload` blob (decrypted by the peer):

```json
{
  "type": "offer", // or "answer", "candidate"
  "sdp": "v=0...",
  "sender_pubkey": "..."
}
```

### Key Exchange (X3DH)
To establish the shared secret for encrypting the signaling channel itself:
1.  **Identity Keys:** Users generate stable Ed25519 keys (derived from Sui wallet signature).
2.  **Pre-Keys:** When joining a room, users publish a signed "Pre-Key Bundle" to the Room Registry (or gossip it via the Node).
3.  **Handshake:** 
    - Peer A fetches Peer B's bundle.
    - Peer A derives shared secret (ECDH).
    - Peer A sends initial encrypted message to Peer B.

---

## 3. Media Encryption (E2EE)

Standard WebRTC encryption (DTLS-SRTP) is terminated at the TURN server (if it acts as an SFU) or is point-to-point. To ensure the Node Operator (if acting as SFU/Relay) cannot see video, we use **WebRTC Insertable Streams**.

### Mechanism
1.  **Frame Capture:** Browser captures video frame.
2.  **Encryption Worker:** 
    - A `TransformStream` intercepts the encoded frame.
    - Encrypts the frame payload using AES-GCM-128 with a per-frame IV.
    - Key is the **Room Key** (rotated periodically).
3.  **Transmission:** Encrypted frame sent via WebRTC.
4.  **Decryption Worker:** Receiver decrypts frame before decoding.

### Key Management (SMLS - Sender Keys)
Inspired by MLS (Messaging Layer Security):
- Each participant generates a **Sender Key**.
- They encrypt this key and send it to all other participants via the **Encrypted Signaling Channel**.
- When a participant leaves, keys are rotated (Ratchet).

---

## 4. IP Privacy (Forced TURN)

To prevent peers from seeing each other's IP addresses (a common WebRTC leak):

1.  **ICE Transport Policy:** Set to `relay` in `RTCPeerConnection` config.
    ```javascript
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "turn:node-operator.com", ... }],
      iceTransportPolicy: "relay" // BLOCKS direct connections
    });
    ```
2.  **Node Operator Role:**
    - Runs `coturn` server.
    - Authenticates users via a time-limited token signed by their Sui wallet (proof of stake).
    - Relays UDP/TCP traffic.

---

## 5. Implementation Roadmap

### Phase 2.1: Client Library (`tai-p2p-client`)
- [ ] Implement `SignalClient` (WebSocket + E2EE layer).
- [ ] Implement `MediaEncryptor` (Insertable Streams worker).
- [ ] Implement `KeyManager` (Rotation and exchange).

### Phase 2.2: Node Infrastructure
- [ ] Configure `coturn` docker container.
- [ ] Build `signal-relay` server (Node.js/Go) - dumb forwarder.

### Phase 2.3: Frontend Integration
- [ ] UI for "Private Room" creation.
- [ ] "Privacy Shield" indicator (shows E2EE status).

---

## 6. Privacy Analysis

| Threat | Mitigation | Residual Risk |
|--------|------------|---------------|
| **Node Operator (Signaling)** | Cannot read SDP/ICE (E2EE signaling). | Knows who is in the room (metadata). |
| **Node Operator (TURN)** | Cannot view video (Insertable Streams). | Knows IP addresses of participants. |
| **Peer (Viewer)** | Cannot see Streamer's IP (TURN relay). | Can record the decrypted video stream. |
| **ISP / Network Snooper** | Sees encrypted traffic (TLS/DTLS). | Traffic analysis (packet sizes/timing). |

**Conclusion:** This architecture achieves the "Highest Possible Privacy" feasible without Tor/I2P latency penalties.
