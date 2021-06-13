import pipe from 'it-pipe'
import * as vclock from '@thi.ng/vclock'
import * as libp2p from 'libp2p'
import { AcquireLockMsg, P2PMutexConn, PossibleMsg, ReleaseLockMsg } from './interface'
import { MAIN_CLOCK_ID, QUEUE_CLOCK_ID } from './total-order'
import { PeerId } from 'libp2p/src/metrics'

export namespace P2PMutexProtocol {
  // The codec of our protocol
  export const PROTOCOL = '/libp2p/p2p-mutex/1.0.0'

  /**
   * A simple handler to print incoming messages to the console
   * @param {Object} params
   * @param {Connection} params.connection The connection the stream belongs to
   * @param {Stream} params.stream stream to the peer
   */
  export function mkhandler(localPeerId: PeerId, conn: P2PMutexConn) {
    return async (opts: { connection: any; stream: any }) => {
      try {
        await pipe(opts.stream, async function(source) {
          for await (const message of source) {
            // console.info(
            //   `Message received ${opts.connection.remotePeer.toB58String().slice(0, 8)}: ${message}`
            // )
            handleMsg(message, localPeerId.toB58String(), conn)
          }
        })
        // Replies are done on new streams, so let's close this stream so we don't leak it
        await pipe([], opts.stream)
      } catch (err) {
        console.error(err)
      }
    }
  }

  /**
   * Writes a given `message` over the given `stream`.
   * @param {String} message The message to send over `stream`
   * @param {Stream} stream A stream over the muxed Connection to our peer
   */
  export async function send(message: any, stream: any) {
    try {
      await pipe([message], stream, async (source: string[]) => {
        for await (const message of source) {
          console.info(`Me: ${message}`)
        }
      })
    } catch (err) {
      console.error(err)
    }
  }
}

async function handleMsg(msg: string, localPeerId: string, conn: P2PMutexConn) {
  const msgParsed = JSON.parse(msg) as PossibleMsg
  if (msgParsed?.type === 'ACQUIRE_LOCK') {
    handleAcquireLockMsg(msgParsed as AcquireLockMsg, conn)
  } else if (msgParsed?.type === 'RELEASE_LOCK') {
    handleReleaseLockMsg(msgParsed as ReleaseLockMsg, localPeerId, conn)
  } else console.log(`Recieved message with unknown type ${msgParsed?.type}`)
}

async function handleReleaseLockMsg(msg: ReleaseLockMsg, localPeerId: string, conn: P2PMutexConn) {
  const clock = vclock.merge(conn.totalOrderInst.getClock(), msg.clock)
  const clockNew = vclock.inc(clock, MAIN_CLOCK_ID)
  const eventTop = conn.totalOrderInst.peekEventQueue(clockNew[MAIN_CLOCK_ID])
  if (!eventTop) return
  if (eventTop.peerId === localPeerId) {
    const event = conn.totalOrderInst.dequeueEvents(clockNew[MAIN_CLOCK_ID])
    if (!event) throw new Error('Event should not be undefined')
    if (event.fn) await event.fn()
  }
  conn.totalOrderInst.setClock(clockNew)
}

function handleAcquireLockMsg(msg: AcquireLockMsg, conn: P2PMutexConn) {
  const clock = vclock.merge(conn.totalOrderInst.getClock(), msg.clock)
  conn.totalOrderInst.addToEventQueue({
    peerId: msg.peerId,
    timestamp: msg.timestamp
  })
  conn.totalOrderInst.setClock(clock)
}

/**
 * Increment the queue clock ID when a lock acquire message comes in
 * Increment the main clock ID when a release
 * todo: this means that all actors are entirely trusted
 */
