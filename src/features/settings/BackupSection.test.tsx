import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { SEED_EXERCISES, syncSeedExercises } from '../../db/seed'
import { exportBackup } from './backup'
import { BackupSection } from './BackupSection'

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

/** Simula o usuário escolhendo um arquivo no seletor. */
function chooseFile(content: string) {
  const input = screen.getByLabelText('Importar backup', { selector: 'input' })
  const file = new File([content], 'backup.json', { type: 'application/json' })
  fireEvent.change(input, { target: { files: [file] } })
}

describe('BackupSection', () => {
  it('importa um backup e mostra quantos registros entraram', async () => {
    // Gera um backup com o seed e depois esvazia o banco ("aparelho novo").
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

  it('explica quando o arquivo não é um backup', async () => {
    render(<BackupSection />)
    chooseFile('{"qualquer": "coisa"}')

    expect(
      await screen.findByText('Esse arquivo não é um backup do Encore.'),
    ).toBeInTheDocument()
  })
})

describe('exportar e "último backup"', () => {
  /** Finge a tela de compartilhar do celular; `share` decide o que o usuário fez. */
  function fakeShareSheet(share: () => Promise<void>) {
    Object.defineProperty(navigator, 'canShare', {
      value: () => true,
      configurable: true,
    })
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
  }

  afterEach(() => {
    // Remove as funções falsas: o jsdom não tem nenhuma das duas.
    Reflect.deleteProperty(navigator, 'canShare')
    Reflect.deleteProperty(navigator, 'share')
  })

  it('compartilhar o arquivo grava a data do backup', async () => {
    fakeShareSheet(() => Promise.resolve())
    render(<BackupSection />)
    expect(await screen.findByText('Último backup: nunca')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Exportar backup' }))

    expect(await screen.findByText('Backup exportado.')).toBeInTheDocument()
    expect(await screen.findByText('Último backup: hoje')).toBeInTheDocument()
  })

  it('fechar a tela de compartilhar sem escolher nada não conta como backup', async () => {
    fakeShareSheet(() => Promise.reject(new DOMException('cancelou', 'AbortError')))
    render(<BackupSection />)

    fireEvent.click(await screen.findByRole('button', { name: 'Exportar backup' }))

    // Espera o botão voltar a funcionar (a exportação terminou).
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Exportar backup' })).toBeEnabled(),
    )
    expect(screen.queryByText('Backup exportado.')).not.toBeInTheDocument()
    expect(screen.getByText('Último backup: nunca')).toBeInTheDocument()
    expect((await db.settings.toArray())[0]?.lastBackupAt ?? null).toBeNull()
  })
})
