// @ts-ignore
import WStar from 'libp2p-webrtc-star'
import { multiaddr } from 'multiaddr'
import pipe from 'it-pipe'
import * as PeerId from 'peer-id'
import { collect } from 'streaming-iterables'
import { P2PConnectPeersOpts, P2PMutexConn, P2PMutexInitOpts } from './interface'

export namespace P2PMutex {
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
      initListener: listener,
      _ws: ws
    }
  }

  export async function connectPeers(
    connection: P2PMutexConn,
    opts: P2PConnectPeersOpts
  ): Promise<void> {
    const peerSockets = await Promise.all(
      opts.peerAddresses.map(async peerAddr => {
        const socket = await connection._ws.dial(multiaddr(peerAddr))
        return socket
      })
    )

    console.log((await pipe(peerSockets[0], collect)).toString())

    await Promise.all(
      peerSockets.map(async socket => {
        console.log(`Value: ${(await pipe(socket, collect)).toString()}`)
      })
    )
    await connection.initListener.close()
  }
}
