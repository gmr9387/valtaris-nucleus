type Callback = (data: any) => void;

export class Realtime {
  private socket: WebSocket | null = null;
  private listeners: Record<string, Callback[]> = {};

  connect(url: string) {
    this.socket = new WebSocket(url);

    this.socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const group = msg.type;
      if (this.listeners[group]) {
        this.listeners[group].forEach((cb) => cb(msg.payload));
      }
    };
  }

  on(type: string, cb: Callback) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(cb);
  }

  send(type: string, payload: any) {
    if (!this.socket) return;
    this.socket.send(JSON.stringify({ type, payload }));
  }
}

export const realtime = new Realtime();
