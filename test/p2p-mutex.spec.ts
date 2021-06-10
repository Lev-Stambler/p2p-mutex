import { P2PMutex } from '../src/p2p-mutex'
import { expect } from 'aegir/utils/chai'
import PeerId from 'peer-id'
import { multiaddr, MultiaddrInput } from 'multiaddr'

/**
 * Dummy test
 */
describe('Dummy test', async function() {

  let localAddr: MultiaddrInput
  let peers: PeerId[]
  let localPeer: PeerId
  let peerAddresses: MultiaddrInput[]

  before(async () => {
    // Create 10 peers

    peers = await Promise.all([...Array(5).keys()].map(async i => await PeerId.create()))
    peerAddresses = peers.map(peer =>
      multiaddr(
        `/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star/p2p/${peer.toB58String()}`
      )
    )
  })

  it('connect 5 peers to each other', async () => {
    const conns = await Promise.all(
      peers.map(
        async (peer, i) =>
          await P2PMutex.init({
            localPeer: peer,
            localAddress: peerAddresses[i]
          })
      )
    )
    await Promise.all(
      conns.map(async (conn, i) => {
        const _peerAddresses = [...peerAddresses]
        // delete self
        _peerAddresses.splice(i, 1)
        await P2PMutex.connectPeers(conn, { peerAddresses: _peerAddresses })
      })
    )

    expect(true).equal(true)
  })
})
