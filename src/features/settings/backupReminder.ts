import type { Timestamp } from '../../db/types'

/*
 * Lembrete de backup. Os treinos vivem só no aparelho: trocar de celular ou
 * limpar os dados do navegador apaga tudo. Um lembrete discreto de tempos em
 * tempos é a defesa mais barata contra isso.
 */

/** Depois de quantos dias sem backup o lembrete aparece. */
export const BACKUP_REMINDER_DAYS = 14

const DAY_MS = 24 * 60 * 60 * 1000

/** Dias inteiros desde `since` (0 = menos de 24h). */
export function daysSince(since: Timestamp, now: Timestamp): number {
  return Math.max(0, Math.floor((now - since) / DAY_MS))
}

/**
 * Mostrar o lembrete? Só quando já existe algo a perder (pelo menos um treino
 * finalizado) e nunca houve backup, ou o último tem 14 dias ou mais.
 */
export function needsBackupReminder(
  lastBackupAt: Timestamp | null,
  finishedWorkouts: number,
  now: Timestamp,
): boolean {
  if (finishedWorkouts === 0) {
    return false
  }
  return lastBackupAt === null || daysSince(lastBackupAt, now) >= BACKUP_REMINDER_DAYS
}
