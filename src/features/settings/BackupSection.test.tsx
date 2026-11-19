import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { SEED_EXERCISES, syncSeedExercises } from '../../db/seed'
import { exportBackup } from './backup'
import { BackupSection } from './BackupSection'

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

/** Simulates the user picking a file in the file picker. */
function chooseFile(content: string) {
  const input = screen.getByLabelText('Importar backup', { selector: 'input' })
  const file = new File([content], 'backup.json', { type: 'application/json' })
  fireEvent.change(input, { target: { files: [file] } })
}

describe('BackupSection', () => {
  it('imports a backup and shows how many records came in', async () => {
    // Generates a backup with the seed and then empties the database ("new device").
    await syncSeedExercises(db)
    const backup = JSON.stringify(await exportBackup(db))
    await db.exercises.clear()

    render(<BackupSection />)
    chooseFile(backup)

    expect(
      await screen.findByText(
        `Backup importado: ${SEED_EXERCISES.length} registros novos, 0 atualizados.`,
      ),
    ).toBeInTheDocument()
    expect(await db.exercises.count()).toBe(SEED_EXERCISES.length)
  })

  it('explains when the file is not a backup', async () => {
    render(<BackupSection />)
    chooseFile('{"qualquer": "coisa"}')

    expect(
      await screen.findByText('Esse arquivo não é um backup do Encore.'),
    ).toBeInTheDocument()
  })
})

describe('export and "last backup"', () => {
  /** Fakes the phone's share sheet; `share` decides what the user did. */
  function fakeShareSheet(share: () => Promise<void>) {
    Object.defineProperty(navigator, 'canShare', {
      value: () => true,
      configurable: true,
    })
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
  }

  afterEach(() => {
    // Removes the fake functions: jsdom has neither of them.
    Reflect.deleteProperty(navigator, 'canShare')
    Reflect.deleteProperty(navigator, 'share')
  })

  it('sharing the file records the backup date', async () => {
    fakeShareSheet(() => Promise.resolve())
    render(<BackupSection />)
    expect(await screen.findByText('Último backup: nunca')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Exportar backup' }))

    expect(await screen.findByText('Backup exportado.')).toBeInTheDocument()
    expect(await screen.findByText('Último backup: hoje')).toBeInTheDocument()
  })

  it('closing the share sheet without choosing anything does not count as a backup', async () => {
    fakeShareSheet(() => Promise.reject(new DOMException('cancelou', 'AbortError')))
    render(<BackupSection />)

    fireEvent.click(await screen.findByRole('button', { name: 'Exportar backup' }))

    // Waits for the button to work again (the export finished).
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Exportar backup' })).toBeEnabled(),
    )
    expect(screen.queryByText('Backup exportado.')).not.toBeInTheDocument()
    expect(screen.getByText('Último backup: nunca')).toBeInTheDocument()
    expect((await db.settings.toArray())[0]?.lastBackupAt ?? null).toBeNull()
  })
})
