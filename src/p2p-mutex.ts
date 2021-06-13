// follow https://dev.to/moxystudio/kickoff-your-application-with-js-libp2p-4n8h
// @ts-ignore
import WStar from 'libp2p-webrtc-star'
// @ts-ignore
import Websockets from 'libp2p-websockets'
import Bootstrap from 'libp2p-bootstrap'
import { NOISE } from 'libp2p-noise'
// @ts-ignore
import MPLEX from 'libp2p-mplex'
import * as vclock from '@thi.ng/vclock'
import { Multiaddr, multiaddr } from 'multiaddr'
import pipe from 'it-pipe'
import { collect, filter, consume } from 'streaming-iterables'
import {
  AcquireLockMsg,
  EventFN,
  Msg,
  P2PConnectPeersOpts,
  P2PMutexConn,
  P2PMutexInitOpts,
  ReleaseLockMsg
} from './interface'
import { MAIN_CLOCK_ID, newTotalOrder, QUEUE_CLOCK_ID } from './total-order'
import Libp2p, { MuxedStream } from 'libp2p'
import { P2PMutexProtocol } from './p2p-mutex-protocol'

export namespace P2PMutex {
  /**
   * @param wrtc?: specify the wrtc library if this is being used in a non-browser environment
   */
  export async function init(
    opts: P2PMutexInitOpts,
    wrtc?: any,
    peerIdx?: number
  ): Promise<P2PMutexConn> {
    const node = await Libp2p.create({
      peerId: opts.localPeer,
      addresses: {
        // Add the signaling server address, along with our PeerId to our multiaddrs list
        // libp2p will automatically attempt to dial to the signaling server so that it can
        // receive inbound connections from other peers
        listen: [opts.localAddress || '']
      },
      modules: {
        transport: [Websockets, WStar],
        connEncryption: [NOISE],
        streamMuxer: [MPLEX],
        peerDiscovery: [Bootstrap]
      },
      config: {
        peerDiscovery: {
          [Bootstrap.tag]: {
            enabled: true,
            list: [opts.localAddress?.toString()]
          }
        }
      }
    })

    const conn = { node, localPeer: opts.localPeer, totalOrderInst: newTotalOrder() }
    node.handle(P2PMutexProtocol.PROTOCOL, P2PMutexProtocol.mkhandler(opts.localPeer, conn))
    await node.start()
    return conn
  }

  export async function connectPeers(
    connection: P2PMutexConn,
    opts: P2PConnectPeersOpts
  ): Promise<P2PMutexConn> {
    const peerConns = await Promise.all(
      opts.peerAddresses.map(addr => connection.node.dial(multiaddr(addr)))
    )
    return { ...connection, peerConnections: peerConns }
  }

  export async function acquireLock(connection: P2PMutexConn, fn: EventFN) {
    checkConnection(connection)
    const clock = connection.totalOrderInst.getClock()
    const queuedTimestamp = clock[QUEUE_CLOCK_ID]
    const clockQ = vclock.inc(clock, QUEUE_CLOCK_ID)
    const clockNew = clockQ

    connection.totalOrderInst.setClock(clockNew)
    const msg: AcquireLockMsg = {
      type: 'ACQUIRE_LOCK',
      clock: clockNew,
      peerId: connection.localPeer.toB58String(),
      timestamp: queuedTimestamp
    }
    const streams = await getStreams(connection)
    await Promise.all(
      streams.map(async stream => {
        await P2PMutexProtocol.send(JSON.stringify(msg), stream)
      })
    )
    if (queuedTimestamp === clockNew[MAIN_CLOCK_ID]) {
      fn()
    } else
      connection.totalOrderInst.addToEventQueue({
        timestamp: queuedTimestamp,
        fn,
        peerId: connection.localPeer.toB58String()
      })
  }

  export async function releaseLock(connection: P2PMutexConn) {
    checkConnection(connection)
    const streams = await getStreams(connection)
    const msg: ReleaseLockMsg = {
      type: 'RELEASE_LOCK',
      clock: connection.totalOrderInst.getClock(),
      owner: connection.localPeer.toB58String()
    }
    await Promise.all(streams.map(stream => P2PMutexProtocol.send(JSON.stringify(msg), stream)))
  }
}

function checkConnection(conn: P2PMutexConn) {
  if (!conn.peerConnections) {
    throw 'Peer connections must be defined'
  }
  return true
}

async function getStreams(conn: P2PMutexConn) {
  return await Promise.all(
    (conn.peerConnections || []).map(async peerConn => {
      const { stream, protocol } = await peerConn.newStream([P2PMutexProtocol.PROTOCOL])
      return stream
    })
  )
}
