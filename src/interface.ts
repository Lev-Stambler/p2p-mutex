import * as libp2p from 'libp2p'
import { Libp2p } from 'libp2p/src/connection-manager'
import { MuxedStream } from 'libp2p/src/upgrader'
import { Multiaddr, MultiaddrInput } from 'multiaddr'
import PeerId from 'peer-id'

export interface P2PMutexConn {
  node: Libp2p
  peerConnections?: libp2p.Connection[]
  streams?: MuxedStream[]
}

export interface P2PMutexInitOpts {
  localAddress: string
  localPeer: PeerId
}

export interface P2PConnectPeersOpts {
  peerAddresses: MultiaddrInput[]
}

export interface AcquireLockMsg extends Msg {
  type: 'ACQUIRE_LOCK'
  timestamp: number
  owner: MultiaddrInput
}

export interface Msg {
  type: MsgTypes
}

export type MsgTypes = 'ACQUIRE_LOCK'
