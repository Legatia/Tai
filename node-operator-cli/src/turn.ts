import Turn from 'node-turn';

export function startTurnServer(port: number, realm: string) {
    const server = new Turn({
        // set options
        authMech: 'long-term',
        credentials: {
            username: "password" // TODO: Integrate with Sui auth
        },
        listeningPort: port,
        realm: realm,
        debugLevel: 'ALL'
    });

    server.start();
    return server;
}
