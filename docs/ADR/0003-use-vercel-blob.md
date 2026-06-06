# ADR 0003: Use Vercel Blob

## Status

Accepted.

## Context

The app needs private file storage for uploaded reading content in preview and production while keeping local development simple.

## Decision

Use a storage adapter with local filesystem storage in development and private Vercel Blob in preview/production.

## Consequences

- `Passage.filePath` stores provider-neutral pathnames.
- Preview and production require separate Blob tokens/stores.
- Local file reads are served only through the development-only local blob route.
- Future download/access routes must authenticate and verify ownership.

## Alternatives Considered

- Store files in Postgres: simpler infra, poor fit for PDF/blob payloads.
- S3/R2: viable, but Vercel Blob is simpler for the Vercel deployment target.
