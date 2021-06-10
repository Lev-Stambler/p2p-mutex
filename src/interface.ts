import { Multiaddr, MultiaddrInput } from 'multiaddr'
import PeerId from 'peer-id'

export interface P2PMutexConn {
  initListener: any
  _ws: any
  localAddress: Multiaddr
  _sockets?: any[]
}

export interface P2PMutexInitOpts {
  localAddress: MultiaddrInput
  localPeer: PeerId
}

export interface P2PConnectPeersOpts {
  peerAddresses: MultiaddrInput[]
}

export interface AcquireLockMsg extends Msg {
  timestamp: number
  owner: MultiaddrInput
}

export interface Msg {
  type: string
}
