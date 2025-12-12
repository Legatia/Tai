declare module 'node-turn' {
    export default class Turn {
        constructor(options: any);
        start(): void;
        stop(): void;
        close(): void;
    }
}
