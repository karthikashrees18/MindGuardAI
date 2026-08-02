# database

MongoDB, `mindguard` database. Nothing to build here — this folder
holds schema documentation and the init script Docker runs
automatically — but it's kept as its own top-level folder since the
data model is worth reviewing and agreeing on as a team before the
backend and frontend people build against it.

## Collections

### `users`
| Field | Type | Notes |
|---|---|---|
| `_id` | string (UUID) | |
| `name` | string | |
| `email` | string | unique index |
| `password_hash` | string | bcrypt, never store plaintext |
| `created_at` | ISO datetime string | |

### `journals`
| Field | Type | Notes |
|---|---|---|
| `_id` | string (UUID) | |
| `user_id` | string | references `users._id`; indexed with `created_at` |
| `text` | string | the journal entry |
| `mood` | string \| null | emoji or label from the mood selector |
| `stress_level` | int \| null | 0–100, from the stress slider |
| `rumination_score` | int \| null | 0–100, filled in by the ai module at analyze time |
| `risk_level` | "Low" \| "Moderate" \| "High" \| null | |
| `created_at` | ISO datetime string | |

### `contacts`
| Field | Type | Notes |
|---|---|---|
| `user_id` | string | indexed |
| `name` | string | trusted contact's name |
| `phone_number` | string | E.164 format recommended, e.g. `+91...` |

## Indexes

Created automatically by `init/init-mongo.js` the first time the Mongo
container starts with a fresh volume:

- `users.email` — unique, so signup can rely on a duplicate-key error
- `journals.user_id + created_at` — supports the common query pattern
  (a user's entries, newest first) without a full collection scan
- `contacts.user_id` — supports the emergency-alert lookup

If you already have a running Mongo volume from before this script
existed, apply it manually:

```bash
docker compose exec mongo mongosh mindguard /docker-entrypoint-initdb.d/init-mongo.js
```

## Inspecting data during development

```bash
docker compose exec mongo mongosh mindguard
> db.journals.find().sort({ created_at: -1 }).limit(5)
```

## Notes for whoever owns this

- Journal entries and chat-derived scores are sensitive personal data.
  Before this touches real users: encrypt `text` at rest (or move it to
  a field-level-encrypted collection), add a data-retention/deletion
  policy, and restrict who can query the database directly in
  production (the backend should be the only thing with a Mongo
  connection string).
- If your project report wants to show relational thinking too, an ER
  diagram description: `users (1) —— (many) journals`, `users (1) ——
  (many) contacts`.
