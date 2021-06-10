// @ts-ignore
import WStar from 'libp2p-webrtc-star'
import { multiaddr } from 'multiaddr'
import pipe from 'it-pipe'
import * as PeerId from 'peer-id'
import { collect } from 'streaming-iterables'

const addr = multiaddr(
  '/ip4/188.166.203.82/tcp/20000/wss/p2p-webrtc-star/p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2a'
)

export namespace P2PMutex {
  export async function connect() {
    // This is another peer?
    // const localPeer = await PeerId.create({
    // })
    const localPeer = await PeerId.create()

    console.log("AAAAA")
    return
    console.log(localPeer.toJSON())
    // TODO: does this work?
    const ws = new WStar({
      upgrader: {
        upgradeInbound: (maConn: any) => maConn,
        upgradeOutbound: (maConn: any) => maConn,
        localPeer
      }
    })

    const listener = ws.createListener((socket: any) => {
      console.log('new connection opened')
      pipe(['hello'], socket)
    })

    await listener.listen(addr)
    console.log('listening')

    const socket = await ws.dial(addr)
    const values = await pipe(socket, collect)

    console.log(`Value: ${values.toString()}`)

    // Close connection after reading
    await listener.close()
  }
}
