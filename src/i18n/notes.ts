import type { Language } from '../db/types'

/*
 * Observações de rotinas e exercícios são texto livre do usuário: o app não
 * consegue (nem deve, offline) traduzir o que a pessoa escreveu. A exceção são
 * as frases padrão que o app já gravou nas observações (programa importado antes
 * de ele deixar de vir pronto): essas são reconhecidas e mostradas no idioma
 * escolhido. O que está salvo no banco nunca muda: só a exibição.
 */
const PT_TO_EN: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^Cardio (\d+) min no final\.?$/i, (m) => `Cardio ${m[1]} min at the end.`],
  [
    /^Cardio na esteira: (\d+) min, (.+) km\/h, inclinação (.+?)\.?$/i,
    (m) => `Treadmill cardio: ${m[1]} min, ${m[2]} km/h, incline ${m[3]}.`,
  ],
  [/^Mobilidade antes de começar\.?$/i, () => 'Mobility before starting.'],
  // "Carga por lado (40/40 kg)." — os números ficam como estão.
  [/^Carga por lado \((.+)\)\.?$/i, (m) => `Load per side (${m[1]}).`],
]

/** Observação como deve aparecer na tela, no idioma atual. */
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
