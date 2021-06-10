import { Multiaddr, MultiaddrInput } from 'multiaddr'
import PeerId from 'peer-id'

export interface P2PMutexConn {
  initListener: any
  _ws: any
}

export interface P2PMutexInitOpts {
  localAddress: MultiaddrInput
  localPeer: PeerId
}

export interface P2PConnectPeersOpts {
  peerAddresses: MultiaddrInput[]
}
