// @ts-ignore
import WStar from 'libp2p-webrtc-star'
import * as vclock from '@thi.ng/vclock'
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
    const connectOptsPartial = wrtc ? { wrtc } : {}
    // TODO: does this work?
    const wss = [...Array(opts.localPeer.length).keys()].map(
      i =>
        new WStar({
          ...connectOptsPartial,
          upgrader: {
            upgradeInbound: (maConn: any) => maConn,
            upgradeOutbound: (maConn: any) => maConn,
            localPeer: opts.localPeer[i]
          }
        })
    )

    const initListeners = wss.map((ws, i) =>
      ws.createListener((socket: any) => {
        console.log(`Peer ${peerIdx}: new connection opened for peer #${i}`)
        pipe(['hello'], socket)
        return socket
        // handleData(socket, onRecvs)
      })
    )

    // const listenerMain = ws.createListener(async (socket: any) => {
    //   await handleData(socket, {
    //     AQUIRE_LOCK: {
    //       fn: onLockAcquireMsg,
    //       blocking: true
    //     }
    //   })
    // })
    const localAddressGroup = opts.localAddress.map(multiaddr)
    await Promise.all(initListeners.map((l, i) => l.listen(localAddressGroup[i])))
    // await listenerMain.listen(opts.localAddress)
    console.log(`${peerIdx} is listening`)
    return {
      localAddressGroup,
      initListeners,
      _ws: wss
    }
  }

  export async function connectPeers(
    connection: P2PMutexConn,
    opts: P2PConnectPeersOpts
  ): Promise<P2PMutexConn> {
    const peerSockets = await Promise.all(
      // TODO: make it so that peerAddr are passed in init and that len doesn't have to be passed in
      opts.peerAddresses.map(async (peerAddr, i) => {
        const socket = await connection._ws[i].dial(multiaddr(peerAddr))
        return socket
      })
    )

    // await Promise.all(connection.initListeners.map(l => l.close()))
    // console.log((await pipe(peerSockets[0], collect)).toString())
    const input = (await pipe(peerSockets[0], collect)).toString()
    console.log(input)

    // await forAllSockets(peerSockets, async socket =>
    //   console.log(`Value: ${(await pipe(socket, collect)).toString()}`)
    // await connection.initListener.close()
    // const spinWaitProms = peerSockets.map(socket =>
    // )
    // peerSockets.map(socket =>
    //   handleData(socket, {
    //   })
    // )

    peerSockets.map(socket => handleData(socket, onRecvs))
    return { ...connection, _sockets: peerSockets }
  }

  export async function acquireLock(connection: P2PMutexConn) {
    if (!connection._sockets) {
      throw 'Sockets must be defined'
    }
    const msg: AcquireLockMsg = {
      type: 'ACQUIRE_LOCK',
      timestamp: clock[MAIN_CLOCK_ID],
      owner: 'AAAA' //connection.localAddress.toString()
    }
    // console.log(connection._sockets.length)
    await forAllSockets(connection._sockets, socket => pipe([JSON.stringify(msg)], socket))
  }

  export async function releaseLock(connection: P2PMutexConn) {
    if (!connection._sockets) {
      throw 'Sockets must be defined'
    }
  }
}

async function onLockAcquireMsg(msg: AcquireLockMsg) {
  vclock.inc(clock, MAIN_CLOCK_ID)
}

async function forAllSockets<T>(sockets: any[], fn: (socket: any) => Promise<T>): Promise<T[]> {
  return Promise.all(sockets.map(fn))
}

// TODO: add type verification
async function handleData(
  socket: any,
  onRecvs: { [type: string]: { fn: (input: any & Msg) => any; blocking: boolean } }
) {
  console.log('AA')
  // while (true) {
  const input = JSON.parse((await pipe(socket, collect)).toString())
  console.log('BB')
  console.log('Input val:', input)
  const type = (input as Msg).type
  if (onRecvs[type]) {
    const isBlocking = onRecvs[type].blocking
    if (isBlocking) await onRecvs[type].fn(input)
    else onRecvs[type].fn(input)
  }
  // }
}
