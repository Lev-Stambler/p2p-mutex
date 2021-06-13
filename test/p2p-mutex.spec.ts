import { P2PMutex } from '../src/p2p-mutex'
import { expect } from 'aegir/utils/chai'
import PeerId from 'peer-id'
import { multiaddr, MultiaddrInput } from 'multiaddr'
import wrtc from 'wrtc'
import { P2PMutexConn } from '../src/interface'

const NUMB_PEERS = 4
async function createPeerIds(numbPeers = NUMB_PEERS): Promise<PeerId[]> {
  const peers = await Promise.all([...Array(numbPeers).keys()].map(i => PeerId.create()))
  return peers
}

/**
 * Dummy test
 */
describe('Dummy test', async function() {
  let localAddr: MultiaddrInput
  let peerGroups: PeerId[]
  let localPeer: PeerId
  let peerAddressGroups: MultiaddrInput[]

  before(async () => {
    // Create 10 peers

    peerGroups = await createPeerIds(NUMB_PEERS)
    peerAddressGroups = peerGroups.map((peer, i) =>
      multiaddr(`/ip4/127.0.0.1/tcp/13579/wss/p2p-webrtc-star/p2p/${peer.toString()}`)
    )
  })

  it('connect X peers to each other', async () => {
    const conns = await Promise.all(
      peerGroups.map(
        async (peer, i) =>
          await P2PMutex.init(
            {
              localAddress: peerAddressGroups[i].toString(),
              localPeer: peerGroups[i]
            },
            wrtc,
            i
          )
      )
    )
    try {
      const newConns = await Promise.all(
        conns.map(async (conn, i) => {
          const _peerAddressGroups = [...peerAddressGroups]
          // delete self
          _peerAddressGroups.splice(i, 1)
          const conns = await P2PMutex.connectPeers(conn, { peerAddresses: _peerAddressGroups })
          return conns
        })
      )
      // await new Promise<void>((res, rej) => setTimeout(() => res(), 1500))
      const unlockProms: Promise<void>[] = []
      unlockProms.push((await acquireLockAndSleep(newConns[0], 400, 'Boy 0 msg 0'))())
      unlockProms.push((await acquireLockAndSleep(newConns[1], 400, 'Boy 1 msg 0'))())
      // unlockProms.push((await acquireLockAndSleep(newConns[2], 400, 'Boy 2 msg 0'))())
      console.log('Sent all messages')
      await Promise.all(unlockProms)
    } catch (error) {
      console.log('Error with connecting')
      throw error
    }

    expect(true).equal(true)
  })
})

async function acquireLockAndSleep(
  conn: P2PMutexConn,
  timeout: number,
  msg?: string
): Promise<() => Promise<void>> {
  return new Promise<() => Promise<void>>(async (res, rej) => {
    await P2PMutex.acquireLock(conn, async () => {
      res(
        () =>
          new Promise<void>(async (res, rej) => {
            console.log('GOT LOCK with msg', msg)
            await new Promise<void>((res, rej) => setTimeout(res, 200))
            console.log('RELEASING LOCK with msg', msg)
            await P2PMutex.releaseLock(conn)
            res()
          })
      )
    })
  })
}
