import { useState } from 'react'
import { db } from '../../db/db'
import type { Split } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { Button } from '../../ui/Button'
import { ConfirmSheet } from '../../ui/ConfirmSheet'
import { ArrowLeftIcon, ArrowRightIcon } from '../../ui/icons'
import { Sheet } from '../../ui/Sheet'
import { TextField } from '../../ui/TextField'
import { deleteSplit, moveSplit, updateSplit } from './splitActions'

type SplitSheetProps = {
  /** Split being edited, or `null` with the sheet closed. */
  split: Split | null
  /** How many routines it has (deleting the split deletes the routines: the confirmation shows the number). */
  routineCount: number
  /** Position in the tabs: defines whether it can move left / right. */
  isFirst: boolean
  isLast: boolean
  onClose: () => void
}

/** Sheet to rename, reorder and delete a split. Each change writes immediately. */
export function SplitSheet({
  split,
  routineCount,
  isFirst,
  isLast,
  onClose,
}: SplitSheetProps) {
  const { t } = useI18n()
  return (
    <Sheet
      open={split !== null}
      title={split?.name ?? t.splits.editTitle}
      onClose={onClose}
    >
      {/* `key`: the form restarts when another split is opened. */}
      {split && (
        <SplitForm
          key={split.id}
          split={split}
          routineCount={routineCount}
          isFirst={isFirst}
          isLast={isLast}
          onClose={onClose}
        />
      )}
    </Sheet>
  )
}

type SplitFormProps = Omit<SplitSheetProps, 'split'> & { split: Split }

function SplitForm({ split, routineCount, isFirst, isLast, onClose }: SplitFormProps) {
  const { t } = useI18n()
  // Local state so the cursor does not "jump" while typing; the database writes on every change.
  const [name, setName] = useState(split.name)
  const [notes, setNotes] = useState(split.notes)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleDelete() {
    await deleteSplit(db, split.id)
    setConfirmDelete(false)
    onClose()
  }

  return (
    <div className="flex flex-col gap-6">
      <TextField
        label={t.splits.name}
        value={name}
        onChange={(value) => {
          setName(value)
          // An empty name is not saved: the split keeps its last valid name.
          if (value.trim() !== '') {
            void updateSplit(db, split.id, { name: value.trim() })
          }
        }}
      />
      <TextField
        label={t.splits.notes}
        placeholder={t.splits.notesPlaceholder}
        multiline
        value={notes}
        onChange={(value) => {
          setNotes(value)
          void updateSplit(db, split.id, { notes: value })
        }}
      />

      <div className="grid grid-cols-2 gap-2">
        <Button
          disabled={isFirst}
          aria-label={t.splits.moveLeft}
          onClick={() => void moveSplit(db, split.id, -1)}
        >
          <ArrowLeftIcon className="size-6" />
        </Button>
        <Button
          disabled={isLast}
          aria-label={t.splits.moveRight}
          onClick={() => void moveSplit(db, split.id, 1)}
        >
          <ArrowRightIcon className="size-6" />
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <Button fullWidth onClick={onClose}>
          {t.common.done}
        </Button>
        <Button variant="ghost" fullWidth onClick={() => setConfirmDelete(true)}>
          {t.splits.deleteSplit}
        </Button>
      </div>

      <ConfirmSheet
        open={confirmDelete}
        title={t.splits.deleteTitle}
        description={t.splits.deleteDescription(routineCount)}
        confirmLabel={t.splits.deleteConfirm}
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
