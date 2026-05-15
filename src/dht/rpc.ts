import type { Transport } from './transport';

export class RpcClient {
  constructor(private readonly transport: Transport) {}

  async ping(target: string) {
    await this.transport.send(target, { type: 'PING', payload: {} });
  }

  async store(target: string, key: string, value: unknown) {
    await this.transport.send(target, { type: 'STORE', payload: { key, value } });
  }
}
