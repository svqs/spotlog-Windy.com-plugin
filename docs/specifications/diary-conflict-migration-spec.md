# Diary conflict migration (0.18)

Status: local revisions/client implemented in 0.18.0. Supabase server files were removed in 0.18.1; the server protocol below is historical design for a future backend, not a deployable module.

Implement optional `revisions: Record<id, milliseconds>` and `settingsAt` on version-1 documents. Normalize finite,
nonnegative stamps; old diaries have no inferred item history. Before a local edit, retain an immutable serialized
baseline. Stamp only changed/new entities and settings, with a monotonic local clock. Deletes and revivals retain
their existing stamps and precedence. Import intentionally replaces and revives incoming entities at the local clock.

Merge each entity using its revision (falling back to document `updatedAt` only for legacy entities). Equal revisions
use lexicographic canonical JSON for a deterministic winner; settings use `settingsAt` similarly. Tombstones defeat
items unless a revival is at least as new. Union revision metadata. Do not prune entity revisions independently of
entities. Legacy clients cannot preserve independent edits they never recorded; migration cannot recover past losses.
New clients preserve legacy loading/export, but do not claim concurrency safety when an old client overwrites local
storage. Full merge comparison in the tab listener includes contents and stamp values, not only ids.

The server stores an independent integer `revision`, initially zero for existing rows. GET returns it. PUT requires
`expectedRevision` and runs an atomic SQL compare-and-swap, incrementing revision on success. Creation expects zero.
A conflict returns 409, so the client pulls, merges, and retries (bounded attempts; later scheduled retry on failure).
Legacy PUT requests lacking a revision receive 428; they cannot silently overwrite upgraded diaries. Apply SQL before
upgrading the Edge Function; clients must use the new protocol before enabling sync. No deployment is part of this work.

Keep settings whole-object last-edit-wins for now, with deterministic ties. Clocks establish ordering, not causality;
same-entity simultaneous edits still choose one copy. Independent entity edits must survive, delete/undo/import
precedence must hold, and malformed/legacy documents must normalize. Tests cover commutative merges, distinct edits,
same-entity ties, legacy fallback, settings, revival and conditional server writes. Neither schema change nor tooling
cleanup changes recommendation thresholds or enables optional sync.
