# Photos stored inline in synced records, not in a separate blob store

Expenses gain an optional **Receipt Photo** and recipes an optional **Dish Photo**. We store
each photo as a base64 field **on its own record**, so it rides the existing sync path
unchanged: applied to the Dexie mirror and outbox optimistically, flushed via `POST /api/sync`,
persisted in SQLite, and broadcast over WebSocket to other clients — exactly like every other
field. Photos are downscaled and compressed on the client before storage (~1024px long edge,
JPEG ~0.7) and treated as throwaway "good enough to recognize it" snapshots.

The decisive reason is **offline-first**, which is the point of this app: a leader can snap a
receipt at a camp with no signal and have it sync later, and can view it offline — both fall
out for free because the bytes live in the outbox and the mirror like any other write.

## Considered options

- **Separate blob store** (`/api/blobs`, file/row server-side, record holds only an id/URL).
  Rejected: it actively breaks offline-first — you can't upload a blob with no signal (it
  isn't in the outbox) and can't view it offline without building separate IndexedDB caching
  and a service-worker rule. It only wins at a scale (a large, full-resolution photo library)
  this 2–3 person tool will never reach.

## Consequences

- Photo bytes travel through the WebSocket broadcast, sit in SQLite rows, live in IndexedDB,
  and are re-pulled on a cold hydrate. Kept small by mandatory client-side compression;
  acceptable at this scale (a handful of photos per camp).
- `Expense.receiptPhoto` and `Recipe.dishPhoto` are plain optional fields — these are
  *extend-an-existing-entity* slices (no new entity, no new Dexie table, no version bump).
- Fastify's default 1 MB `bodyLimit` and the WS frame size must accommodate a `/api/sync`
  batch that may carry one or more photos; raise the limit and keep per-photo bytes small.
