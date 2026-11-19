/*
 * Bipe sintetizado com a Web Audio API (sem arquivo de som: nada a mais no cache).
 *
 * Regra dos navegadores (principalmente iOS): áudio só toca se foi "destravado"
 * por um toque do usuário. Por isso `unlockAudio()` deve ser chamado DENTRO de
 * um toque (ex.: ao concluir uma série), e o bipe pode tocar depois, sozinho.
 * Obs.: no iPhone, a chave de silencioso também silencia este som.
 */

let context: AudioContext | null = null

/** Prepara o áudio. Chame no momento de um toque do usuário. */
export function unlockAudio(): void {
  if (typeof window.AudioContext !== 'function') {
    return // navegador sem Web Audio (ou ambiente de teste)
  }
  context ??= new AudioContext()
  if (context.state === 'suspended') {
    void context.resume()
  }
}

/** Três bipes curtos e agudos ("bip-bip-bip"). Não faz nada se o áudio não foi destravado. */
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
    oscillator.frequency.value = 880 // Lá agudo: corta o barulho da academia.
    // Envelope: sobe rápido e cai, para não "estalar" no começo e no fim.
    gain.gain.setValueAtTime(0.0001, begin)
    gain.gain.exponentialRampToValueAtTime(0.2, begin + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, begin + 0.15)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(begin)
    oscillator.stop(begin + 0.16)
  }
}
