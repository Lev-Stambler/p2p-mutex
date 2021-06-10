import { P2PMutex } from '../src/p2p-mutex'

/**
 * Dummy test
 */
describe('Dummy test', () => {
  it('works if true is truthy', async () => {
    await P2PMutex.connect()
    expect(true).toBeTruthy()
  })

})
