// follow https://github.com/libp2p/js-libp2p/blob/master/examples/libp2p-in-the-browser/index.js
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
  Msg,
  P2PConnectPeersOpts,
  P2PMutexConn,
  P2PMutexInitOpts
} from './interface'
import { clock, MAIN_CLOCK_ID } from './total-order'
import Libp2p, { MuxedStream } from 'libp2p'
import { P2PMutexProtocol } from './p2p-mutex-protocol'

const onRecvs = {
  AQUIRE_LOCK: {
    fn: onLockAcquireMsg,
    blocking: true
  }
}

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

    node.handle(P2PMutexProtocol.PROTOCOL, P2PMutexProtocol.handler)
    await node.start()
    return { node }
  }

  export async function connectPeers(
    connection: P2PMutexConn,
    opts: P2PConnectPeersOpts
  ): Promise<P2PMutexConn> {
    const peerConns = await Promise.all(
      opts.peerAddresses.map(addr => connection.node.dial(multiaddr(addr)))
    )
    const streams = await Promise.all(
      peerConns.map(async peerConn => {
        const { stream, protocol } = await peerConn.newStream([P2PMutexProtocol.PROTOCOL])
        console.log(protocol)
        return stream
      })
    )
    return { ...connection, peerConnections: peerConns, streams }
  }

  export async function acquireLock(connection: P2PMutexConn) {
    if (!connection.peerConnections && !connection.streams) {
      throw 'Peer connections must be defined'
    }
    const msg: AcquireLockMsg = {
      type: 'ACQUIRE_LOCK',
      timestamp: clock[MAIN_CLOCK_ID],
      owner: 'AAAA' //connection.localAddress.toString()
    }
    // console.log(connection._sockets.length)
    await Promise.all(
      (connection.streams || []).map(async stream => {
        P2PMutexProtocol.send(JSON.stringify(msg), stream)
      })
    )
  }

  export async function releaseLock(connection: P2PMutexConn) {
    if (!connection.peerConnections) {
      throw 'Sockets must be defined'
    }
  }
}

async function onLockAcquireMsg(msg: AcquireLockMsg) {
  vclock.inc(clock, MAIN_CLOCK_ID)
}
