import { VClock } from '@thi.ng/vclock'
import * as libp2p from 'libp2p'
import { Libp2p } from 'libp2p/src/connection-manager'
import { MuxedStream } from 'libp2p/src/upgrader'
import { Multiaddr, MultiaddrInput } from 'multiaddr'
import * as vclock from '@thi.ng/vclock'
import PeerId from 'peer-id'

export type EventFN = (...args: any) => any
export type Event = {
  timestamp: number
  fn?: EventFN
  peerId: string
}

export interface TotalOrderInst {
  setClock: (newClock: vclock.VClock) => void
  getClock: () => vclock.VClock
  addToEventQueue: (event: Event) => void
  peekEventQueue: (timestamp: number) => Event | undefined
  dequeueEvents: (timestamp: number) => Event | undefined
}
export interface P2PMutexConn {
  node: Libp2p
  localPeer: PeerId
  peerConnections?: libp2p.Connection[]
  totalOrderInst: TotalOrderInst
}

export interface P2PMutexInitOpts {
  localAddress: string
  localPeer: PeerId
}

export interface P2PConnectPeersOpts {
  peerAddresses: MultiaddrInput[]
}

export interface ReleaseLockMsg extends Msg {
  type: 'RELEASE_LOCK'
  clock: VClock
  owner: MultiaddrInput
}

export interface AcquireLockMsg extends Msg {
  type: 'ACQUIRE_LOCK'
  clock: VClock
  peerId: string
  timestamp: number
}

export interface Msg {
  type: MsgTypes
}

export type PossibleMsg = AcquireLockMsg | ReleaseLockMsg

export type MsgTypes = 'ACQUIRE_LOCK' | 'RELEASE_LOCK'
