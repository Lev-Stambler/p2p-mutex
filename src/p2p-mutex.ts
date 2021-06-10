// @ts-ignore
import WStar from 'libp2p-webrtc-star'
import { Multiaddr, multiaddr } from 'multiaddr'
import pipe from 'it-pipe'
import { collect, filter } from 'streaming-iterables'
import {
  AcquireLockMsg,
  Msg,
  P2PConnectPeersOpts,
  P2PMutexConn,
  P2PMutexInitOpts
} from './interface'
import { clock, MAIN_CLOCK_ID } from './total-order'

export namespace P2PMutex {
  /**
   * @param wrtc?: specify the wrtc library if this is being used in a non-browser environment
   */
  export async function init(opts: P2PMutexInitOpts, wrtc?: any): Promise<P2PMutexConn> {
    const connectOptsPartial = wrtc ? { wrtc } : {}
    // TODO: does this work?
    const ws = new WStar({
      ...connectOptsPartial,
      upgrader: {
        upgradeInbound: (maConn: any) => maConn,
        upgradeOutbound: (maConn: any) => maConn,
        localPeer: opts.localPeer
      }
    })

    const listener = ws.createListener((socket: any) => {
      console.log('new connection opened')
      pipe(['hello'], socket)
    })

    await listener.listen(opts.localAddress)
    console.log('listening')
    return {
      localAddress: multiaddr(opts.localAddress),
      initListener: listener,
      _ws: ws
    }
  }

  export async function connectPeers(
    connection: P2PMutexConn,
    opts: P2PConnectPeersOpts
  ): Promise<P2PMutexConn> {
    const peerSockets = await Promise.all(
      opts.peerAddresses.map(async peerAddr => {
        const socket = await connection._ws.dial(multiaddr(peerAddr))
        return socket
      })
    )

    console.log((await pipe(peerSockets[0], collect)).toString())

    await forAllSockets(peerSockets, async socket =>
      console.log(`Value: ${(await pipe(socket, collect)).toString()}`)
    )
    await connection.initListener.close()
    peerSockets.map(socket => spinWait(socket))
    return { ...connection, _sockets: peerSockets }
  }

  export async function acquireLock(connection: P2PMutexConn) {
    if (!connection._sockets) {
      throw 'Sockets must be defined'
    }
    const msg: AcquireLockMsg = {
      timestamp: clock[MAIN_CLOCK_ID],
      owner: connection.localAddress.toString()
    }
    await forAllSockets(connection._sockets, socket => pipe([JSON.stringify(msg)]))
  }

  export async function releaseLock(connection: P2PMutexConn) {
    if (!connection._sockets) {
      throw 'Sockets must be defined'
    }
  }
}

async function forAllSockets<T>(sockets: any[], fn: (socket: any) => Promise<T>): Promise<T[]> {
  return await Promise.all(sockets.map(fn))
}

// TODO: add type verification
async function spinWait(
  socket: any,
  onRecvs: { [type: string]: { fn: (input: any & Msg) => any, blocking: boolean}},
) {
  while (true) {
    const input = JSON.parse(await pipe(socket, collect).toString()) 
    const type = (input as Msg).type
    const isBlocking = onRecvs[type].blocking
    if (isBlocking)
      await onRecvs[type].fn(input)
    else
      onRecvs[type].fn(input)
    // If ordered is true, wait for the handler to finish before collecting the next message
    // if (ordered) await onRecv(input)
    // else onRecv(input)
  }
}
