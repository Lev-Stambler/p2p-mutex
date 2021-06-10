import * as vclock from '@thi.ng/vclock'

export let clock: vclock.VClock = {}

export const MAIN_CLOCK_ID = 0
clock[MAIN_CLOCK_ID] = 0

export const eventQueue = []
