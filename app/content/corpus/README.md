# Corpus

Per-user 答主 corpora consumed by:
- **Plan #5 (vault RAG)** — embeds article bodies into pgvector for retrieval
- **Plan #6 (voice writer)** — reads `voice-fingerprint.json` to score rewritten drafts

## Shape

```
content/corpus/<userId>/
├── profile.json              # answerer metadata + voiceRegisterNotes
├── voice-fingerprint.json    # produced by scripts/extract-voice-fingerprint.ts
└── articles/
    ├── 01-*.md               # YAML frontmatter + body
    ├── 02-*.md
    └── ...
```

## Users seeded in plan #2

- `guwanxi/` — fictional 答主, 4 articles (~9500字), full fingerprint
- `me/` — real user (Tyang4 / SCU bioE), profile only, articles deferred

## Regenerate fingerprint

```bash
pnpm tsx scripts/extract-voice-fingerprint.ts <userId>
```

Errors with exit 1 if `articles/` has fewer than 3 files.
