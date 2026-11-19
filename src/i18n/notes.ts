import type { Language } from '../db/types'

/*
 * Notes on routines and exercises are free text from the user: the app
 * cannot (and should not, offline) translate what the person wrote. The exception is
 * the standard phrases the app already saved in the notes (program imported before
 * it stopped shipping ready-made): those are recognized and shown in the chosen
 * language. What is saved in the database never changes: only the display.
 */
const PT_TO_EN: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^Cardio (\d+) min no final\.?$/i, (m) => `Cardio ${m[1]} min at the end.`],
  [
    /^Cardio na esteira: (\d+) min, (.+) km\/h, inclinação (.+?)\.?$/i,
    (m) => `Treadmill cardio: ${m[1]} min, ${m[2]} km/h, incline ${m[3]}.`,
  ],
  [/^Mobilidade antes de começar\.?$/i, () => 'Mobility before starting.'],
  // "Carga por lado (40/40 kg)." — the numbers stay as they are.
  [/^Carga por lado \((.+)\)\.?$/i, (m) => `Load per side (${m[1]}).`],
]

/** Note as it should appear on screen, in the current language. */
export function translateNote(note: string, language: Language): string {
  if (language === 'pt') {
    return note
  }
  const trimmed = note.trim()
  for (const [pattern, translate] of PT_TO_EN) {
    const match = trimmed.match(pattern)
    if (match) {
      return translate(match)
    }
  }
  return note
}
