import { useCallback, useState } from "react";
import { confirmAsk, notify, revealPath } from "../api/tauri";
import { useTranslation } from "../i18n/context";
import { useFormat } from "./useFormat";
import { useTrash } from "./useTrash";
import { TrashProgressModal } from "../components/common/TrashProgressModal";
import type { ScanEntry, TrashDone } from "../types/models";

/** Batches >= this many items show the progress modal; smaller deletes are
 *  effectively instant and don't need it. */
const MODAL_THRESHOLD = 5;

/**
 * Shared trash behaviour for the scan tables (Largest + Explorer): reveal, a
 * single confirmed delete, and a confirmed multi-delete that runs in the
 * background with a progress modal. The caller passes a `remove(ids)` callback
 * to prune its own row list when items are actually deleted.
 */
export function useTrashActions(remove: (ids: number[]) => void) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const [showModal, setShowModal] = useState(false);

  const onDone = useCallback(
    (done: TrashDone) => {
      if (done.removed.length) remove(done.removed);
      setShowModal(false);
      if (done.failed > 0) {
        notify(t("trash.failedNote", { count: done.failed }));
      }
    },
    [remove, t],
  );

  const trash = useTrash(onDone);

  const reveal = useCallback(async (e: ScanEntry) => {
    try {
      await revealPath(e.path);
    } catch {
      /* ignore */
    }
  }, []);

  /** Confirmed delete of selected entries. Shows the modal for large batches. */
  const deleteMany = useCallback(
    async (entries: ScanEntry[]) => {
      if (!entries.length) return;
      const totalSize = entries.reduce((s, e) => s + e.size, 0);
      const ok = await confirmAsk(
        t("action.confirmTrashMany", { count: entries.length, size: fmt.bytes(totalSize) }),
      );
      if (!ok) return;
      if (entries.length >= MODAL_THRESHOLD) setShowModal(true);
      await trash.start(entries.map((e) => e.id));
    },
    [trash, t, fmt],
  );

  /** Confirmed delete of a single entry (used by the row trash icon). */
  const deleteOne = useCallback(
    async (e: ScanEntry) => {
      const ok = await confirmAsk(
        t("action.confirmTrashOne", { path: e.path, size: fmt.bytes(e.size) }),
      );
      if (!ok) return;
      await trash.start([e.id]);
    },
    [trash, t, fmt],
  );

  const modal =
    showModal && trash.progress ? (
      <TrashProgressModal progress={trash.progress} onCancel={trash.cancel} />
    ) : null;

  return { reveal, deleteOne, deleteMany, modal };
}
