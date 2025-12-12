# Node Operator CLI

Infrastructure services for Tai Private Video Meetings (Privacy Mode).

## What It Does

Provides two essential services for Privacy Mode:
1. **Signaling Server** (WebSocket) - Coordinates P2P connections
2. **TURN Server** - Relays media when direct P2P fails

## Quick Start

### Install Dependencies
```bash
npm install
```

### Build
```bash
npm run build
```

### Run Both Services
```bash
npm start
```

This starts:
- Signaling server on `ws://localhost:8080`
- TURN server on `localhost:3478`

## Testing with Meeting App

1. **Start Node Operator** (this terminal):
   ```bash
   npm start
   ```

2. **Start Meeting App** (separate terminal):
   ```bash
   cd ../meeting_app
   npm run dev
   ```

3. **Test Privacy Mode**:
   - Open http://localhost:3000
   - Toggle "Privacy Mode ON"
   - Sign in and create meeting
   - Privacy mode will use these services for relay

## Configuration

**Signaling Server**:
- Port: `8080` (configurable in `src/signaling.ts`)
- Protocol: WebSocket
- Purpose: Relay encrypted signaling messages

**TURN Server**:
- Port: `3478` (configurable in `src/turn.ts`)
- Protocol: UDP/TCP
- Purpose: Relay media streams when NAT traversal fails

## Architecture

```
┌─────────────┐         WebSocket         ┌──────────────────┐
│   Browser   │◄──────────────────────────►│ Signaling Server │
│  (Peer A)   │      Encrypted Messages    │   (port 8080)    │
└─────────────┘                             └──────────────────┘
      │                                              ▲
      │  Media (via TURN if needed)                  │
      ▼                                              ▼
┌─────────────┐                             ┌──────────────────┐
│ TURN Server │                             │    Browser       │
│ (port 3478) │◄────────────────────────────│   (Peer B)       │
└─────────────┘      Media Relay            └──────────────────┘
```

## Development

Files:
- `src/index.ts` - CLI entry point
- `src/signaling.ts` - WebSocket signaling server
- `src/turn.ts` - TURN server wrapper
- `src/types.d.ts` - Type declarations

## Production Notes

For production deployment:
- Use proper TURN credentials (not "password")
- Implement Sui stake verification for auth
- Use SSL/TLS for WebSocket (wss://)
- Configure firewall rules for TURN ports
