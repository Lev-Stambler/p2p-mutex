import * as vclock from '@thi.ng/vclock'
import { TotalOrderInst, Event, EventFN } from './interface'

export const MAIN_CLOCK_ID = 0
export const QUEUE_CLOCK_ID = 1

interface EventStore {
  [timeStamp: number]: Event[]
}

export const newTotalOrder = (): TotalOrderInst => {
  let clock: vclock.VClock = {}
  clock[MAIN_CLOCK_ID] = 0
  clock[QUEUE_CLOCK_ID] = 0
  const eventStore: EventStore = {}

  return {
    setClock,
    getClock,
    addToEventQueue,
    peekEventQueue,
    dequeueEvents
  }

  function setClock(newClock: vclock.VClock) {
    clock = newClock
  }

  function getClock() {
    return { ...clock }
  }

  function getPositionInEventList(event: Event, eventL: Event[]): number {
    if (eventL.length === 0) return 0
    let i = 0
    for (; i < eventL.length; i++) {
      if (comparePeerIds(event.peerId, eventL[i].peerId) === 1) {
        return i
      }
    }
    return i
  }

  function addToEventQueue(event: Event) {
    if (eventStore[event.timestamp]) {
      const pos = getPositionInEventList(event, eventStore[event.timestamp])
      console.log('Inserting with position', pos)
      const start = eventStore[event.timestamp].slice(0, pos)
      const end = eventStore[event.timestamp].slice(pos, eventStore[event.timestamp].length)
      const newArr = [...start, event, ...end]
      eventStore[event.timestamp] = newArr
    } else eventStore[event.timestamp] = [event]
  }

  function peekEventQueue(timestamp: number): Event | undefined {
    return (eventStore[timestamp] || [])[0]
  }

  function dequeueEvents(timestamp: number): Event | undefined {
    const event = (eventStore[timestamp] || []).shift()
    return event
  }

  function comparePeerIds(a: string, b: string): number {
    const len = a.length > b.length ? b.length : a.length
    for (let i = 0; i < len; i++) {
      if (a[i] > b[i]) return 1
      else if (a[i] < b[i]) return -1
    }
    if (a.length === b.length) return 0
    // The shorter string comes first
    return a.length > b.length ? -1 : 1
  }
}
