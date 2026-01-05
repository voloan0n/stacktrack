declare module "ws" {
  export type RawData = any;

  export default class WebSocket {
    static OPEN: number;
    readyState: number;
    OPEN: number;
    send(data: RawData): void;
    close(): void;
    on(event: string, listener: (...args: any[]) => void): this;
  }

  export class WebSocketServer {
    constructor(options?: any);
    handleUpgrade(...args: any[]): void;
  }
}
