import pipe from 'it-pipe'
import * as libp2p from 'libp2p'

export namespace P2PMutexProtocol {
  // The codec of our protocol
  export const PROTOCOL = '/libp2p/p2p-mutex/1.0.0'

  /**
   * A simple handler to print incoming messages to the console
   * @param {Object} params
   * @param {Connection} params.connection The connection the stream belongs to
   * @param {Stream} params.stream stream to the peer
   */
  export async function handler(opts: { connection: any, stream: any }) {
    try {
      await pipe(opts.stream, async function(source) {
        for await (const message of source) {
          console.info(`${opts.connection.remotePeer.toB58String().slice(0, 8)}: ${message}`)
        }
      })
      // Replies are done on new streams, so let's close this stream so we don't leak it
      await pipe([], opts.stream)
    } catch (err) {
      console.error(err)
    }
  }

  /**
   * Writes a given `message` over the given `stream`.
   * @param {String} message The message to send over `stream`
   * @param {Stream} stream A stream over the muxed Connection to our peer
   */
  export async function send(message, stream) {
    try {
      await pipe([message], stream, async function(source) {
        for await (const message of source) {
          console.info(`Me: ${message}`)
        }
      })
    } catch (err) {
      console.error(err)
    }
  }
}

// TODO: add type verification
async function handleData(
  onRecvs: { [type: string]: { fn: (input: any & Msg) => any; blocking: boolean } }
) {
  // while (true) {
  //   const input = JSON.parse((await pipe(socket, collect)).toString())
  //   console.log('Input val:', input)
  //   const type = (input as Msg).type
  //   if (onRecvs[type]) {
  //     const isBlocking = onRecvs[type].blocking
  //     if (isBlocking) await onRecvs[type].fn(input)
  //     else onRecvs[type].fn(input)
  //   }
  // }
}