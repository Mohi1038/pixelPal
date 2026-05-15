export interface PeerInfo {
  id: string;
  address: string;
  lastSeen: number;
}

export class RoutingTable {
  private readonly peers = new Map<string, PeerInfo>();

  add(peer: PeerInfo) {
    this.peers.set(peer.id, peer);
  }

  nearest(peerId: string, count = 8) {
    return [...this.peers.values()]
      .sort((left, right) => distance(left.id, peerId) - distance(right.id, peerId))
      .slice(0, count);
  }
}

function distance(left: string, right: string) {
  let score = 0;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    score += (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return score;
}
