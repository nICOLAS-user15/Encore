/*
 * Beep synthesized with the Web Audio API (no sound file: nothing extra in the cache).
 *
 * Browser rule (mainly iOS): audio only plays if it was "unlocked"
 * by a user tap. So `unlockAudio()` must be called INSIDE
 * a tap (e.g. when completing a set), and the beep can play later, on its own.
 * Note: on iPhone, the silent switch also mutes this sound.
 */

let context: AudioContext | null = null

/** Prepares the audio. Call it at the moment of a user tap. */
export function unlockAudio(): void {
  if (typeof window.AudioContext !== 'function') {
    return // browser without Web Audio (or test environment)
  }
  context ??= new AudioContext()
  if (context.state === 'suspended') {
    void context.resume()
  }
}

/** Three short, high beeps ("beep-beep-beep"). Does nothing if audio was not unlocked. */
export function playRestBeep(): void {
  if (!context) {
    return
  }
  const start = context.currentTime
  for (let index = 0; index < 3; index++) {
    const begin = start + index * 0.25
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'square'
    oscillator.frequency.value = 880 // High A: cuts through the gym noise.
    // Envelope: rises fast and falls, to avoid a "click" at the start and end.
    gain.gain.setValueAtTime(0.0001, begin)
    gain.gain.exponentialRampToValueAtTime(0.2, begin + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, begin + 0.15)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(begin)
    oscillator.stop(begin + 0.16)
  }
}
