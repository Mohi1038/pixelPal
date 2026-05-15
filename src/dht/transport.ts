export interface TransportMessage {
  type: 'PING' | 'STORE' | 'FIND_NODE' | 'FIND_VALUE';
  payload: Record<string, unknown>;
}

export interface Transport {
  send(target: string, message: TransportMessage): Promise<void>;
}

export class NoopTransport implements Transport {
  async send(_target: string, _message: TransportMessage) {
    return;
  }
}
