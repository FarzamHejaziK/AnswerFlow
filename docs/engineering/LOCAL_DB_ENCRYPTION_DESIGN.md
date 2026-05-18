# Local DB Encryption — Design Doc

**Status:** Design only. Not implemented.
**Owner:** TBD
**Last updated:** 2026-05-15

This is the design document for at-rest encryption of Natively's local SQLite
database (meetings, transcripts, AI responses, reference files, mode metadata).
The current implementation stores all of this in plaintext at
`<userData>/natively.sqlite`.

The retention controls shipped in Phase 9 (this pass) reduce **how long**
plaintext lives on disk — encryption reduces **what an attacker with disk
access can read** while it lives there. They are complementary, not
substitutes.

---

## Threat model

| Threat | In scope | Mitigation |
|---|---|---|
| Casual filesystem snooping (other apps, IT staff with read access) | yes | encryption at rest |
| Stolen unlocked laptop | partial | OS-level disk encryption + app-level key gating |
| Stolen locked laptop with FileVault/BitLocker | covered by OS | n/a |
| Malicious app reading process memory | no | out of scope (requires OS-level isolation) |
| Compromised cloud LLM provider | covered by Phase 1 §1.5 | redaction |
| Backup/sync (iCloud, Google Drive) leaking the DB file | yes | encryption at rest |

---

## Options considered

### Option A — SQLCipher
* Drop-in replacement for `better-sqlite3` with AES-256 encryption.
* Pros: transparent, mature, single-line schema migration (`PRAGMA key`).
* Cons: native build complexity for Mac+Win+Linux; +0.5 MB binary size; key
  must be supplied at every connection open.
* **Recommended.** This is what 1Password / Standard Notes / Obsidian Sync use.

### Option B — Application-layer envelope encryption
* Keep `better-sqlite3`. Encrypt sensitive **columns** (transcript_text,
  summary_text, reference_content) with a per-row data-encryption-key that
  is itself encrypted with a master key in keytar.
* Pros: no native dependency change; can encrypt selectively.
* Cons: queries against encrypted columns become impossible (LIKE / FTS5 /
  vector); we'd lose hybrid RAG over reference files unless we maintain
  parallel encrypted shards. Higher implementation complexity.
* **Not recommended** for this codebase given we just shipped FTS+vector RAG.

### Option C — OS-level keychain-only protection
* Store the DB file with `chmod 600`, mac quarantine flag, no encryption.
* Pros: zero implementation effort.
* Cons: defeats no real attacker. Already de facto in place.
* **Not sufficient.**

---

## Recommended approach (SQLCipher)

### Phase 1 — key plumbing (no schema change yet)
1. Generate a 256-bit master key on first launch using `crypto.randomBytes(32)`.
2. Store it in keytar under service `natively`, account `db-master-key`.
3. Add `DatabaseManager.getEncryptionKey()` that lazy-loads from keytar.
4. Surface a setting `requirePasswordOnLaunch` (default off) — when on, derive
   the key from the password via `argon2id` instead of storing it raw.

### Phase 2 — SQLCipher swap
1. Replace the `better-sqlite3` runtime dependency with `@signalapp/better-sqlite3`
   (signal's SQLCipher fork) OR `node-sqlite3-multiple-ciphers`. Both ship
   prebuilt binaries for Mac/Win/Linux on x64+arm64.
2. On every `new Database(path)` call, immediately issue `PRAGMA key = "x'<hex>'"`
   followed by a `SELECT count(*) FROM sqlite_master` to validate the key.
3. Update `electron-rebuild` postinstall to rebuild the new native module.

### Phase 3 — migration
1. On first launch with an existing plaintext DB:
   1. Export with `VACUUM INTO 'natively-encrypted.sqlite'` after attaching with
      the key.
   2. Atomically swap (rename old → `.bak`, rename encrypted → main).
   3. Schedule the `.bak` for deletion after 7 days (gives the user a recovery
      window if migration breaks anything).
2. On subsequent launches, the DB opens encrypted.

### Phase 4 — key rotation
1. Setting "rotate encryption key" generates a new key, runs
   `PRAGMA rekey = "x'<hex>'"`, updates keytar.
2. Telemetry: `db_key_rotated` (no key material).

### Phase 5 — backup awareness
1. Set `chflags hidden` on macOS and the equivalent NTFS hidden bit on Windows
   for the `.sqlite` file so iCloud/OneDrive don't auto-sync it.
2. Add a setting "exclude from cloud backups" (default on).

---

## Rollback plan

* The pre-encryption `.bak` is kept for 7 days (Phase 3 step 1.3). If the user
  reports a startup issue post-migration, support can rename the `.bak` back.
* If the SQLCipher binary fails to load on a platform we haven't tested,
  `DatabaseManager` falls back to plaintext mode, logs `db_encryption_unavailable`,
  and surfaces a banner in Settings → Privacy.

---

## What this design does NOT cover

* Per-meeting passwords (would require separate encryption keys per row — too
  much UX friction for marginal benefit).
* Encryption of telemetry JSONL (already non-sensitive after Phase 6
  sanitization; can be added if needed).
* Encryption of model files / cached embeddings (large, model-derived; not PII).
* Encryption of in-memory state (out of scope — see threat model).

---

## Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-05-15 | Design doc written; implementation deferred | Phase 9 retention controls give immediate user value with bounded scope; encryption requires a native-module swap that needs CI + cross-platform smoke tests. Track as roadmap §9 follow-up. |
| 2026-05-15 (afternoon) | Re-affirmed: defer SQLCipher; ship honest copy | Audited UI (`src/components/SettingsOverlay.tsx`, onboarding, mode picker) for any "encrypted local database" claim — none present. The Sales-Demo custom mode security FAQ (`tests/fixtures/modes/custom/sales-demo/demo_security_faq.xml`) reads "the local SQLite database is not currently encrypted at rest. Encryption at rest using SQLCipher is on the roadmap. Customers requiring this today should use full disk encryption at the OS level." That copy is the canonical answer to a prospect security question. No product wording change required; roadmap entry kept in `demo_roadmap.md` Q4 2026 line "DB encryption at rest using SQLCipher". |
