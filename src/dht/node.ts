import { RoutingTable, type PeerInfo } from './routingTable';
import { NoopTransport } from './transport';
import { RpcClient } from './rpc';

export class DhtNode {
  readonly routingTable = new RoutingTable();
  readonly rpc = new RpcClient(new NoopTransport());

  constructor(public readonly id: string) {}

  connect(peer: PeerInfo) {
    this.routingTable.add(peer);
  }

  async store(_key: string, _value: unknown) {
    return;
  }

  async findValue(_key: string) {
    return null;
  }
}
