import { P2PMutex } from '../src/p2p-mutex'
import { expect } from 'aegir/utils/chai'
import PeerId from 'peer-id'
import { multiaddr, MultiaddrInput } from 'multiaddr'
import wrtc from 'wrtc'

async function createPeerIds(numbPeers = 5): Promise<PeerId[]> {
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

    peerGroups = await createPeerIds(2)
    peerAddressGroups = peerGroups.map((peer, i) =>
      multiaddr(`/ip4/127.0.0.1/tcp/13579/wss/p2p-webrtc-star/p2p/${peer.toB58String()}`)
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
      await new Promise<void>((res, rej) => setTimeout(() => res(), 1500))
      await P2PMutex.acquireLock(newConns[0])
    } catch (error) {
      console.log('Error with connecting')
      throw error
    }

    await new Promise<void>((res, rej) => setTimeout(() => res(), 1000))

    expect(true).equal(true)
  })
})
