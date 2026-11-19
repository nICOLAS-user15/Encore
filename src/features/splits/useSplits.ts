import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { ID, Split } from '../../db/types'
import { updateSettings } from '../settings/settingsRepository'
import { useSettings } from '../settings/useSettings'
import { listSplits } from './splitQueries'
import { resolveActiveSplit } from './splitUtils'

type UseSplits = {
  /** `undefined` enquanto o banco ainda não respondeu. */
  splits: Split[] | undefined
  /** A divisão escolhida nas abas (`null` se não existe nenhuma). */
  active: Split | null
  /**
   * Escolhe uma divisão: fica salva e vale nas abas Treino e Rotinas. Devolve uma
   * promessa que termina quando a escolha foi gravada: quem vai trocar de tela logo
   * em seguida deve esperar por ela, para a tela nova já abrir na divisão certa.
   */
  select: (splitId: ID) => Promise<void>
}

/**
 * As divisões e qual está escolhida. A escolha é uma só para o app inteiro:
 * trocar a aba na tela Treino também troca na tela Rotinas (e vice-versa).
 */
export function useSplits(): UseSplits {
  const loadedSplits = useLiveQuery(() => listSplits(db), [])
  const { settings, loaded } = useSettings()
  // Só vale como "carregado" quando AS DUAS leituras responderam: antes de ler as
  // configurações, o valor padrão ("a primeira divisão") apareceria por um instante
  // e depois a tela pularia para a divisão que o usuário realmente escolheu.
  const splits = loaded ? loadedSplits : undefined
  return {
    splits,
    active: splits ? resolveActiveSplit(splits, settings.activeSplitId) : null,
    select: (splitId) => updateSettings(db, { activeSplitId: splitId }),
  }
}
