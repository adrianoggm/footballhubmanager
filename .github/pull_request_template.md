<!-- Title must follow Conventional Commits, e.g. feat(backend): add pair player context -->

## What & why
<!-- Short description of the change and the motivation. -->

Closes #

## Type
- [ ] feat
- [ ] fix
- [ ] docs
- [ ] test
- [ ] refactor / chore / perf / ci / build

## Checklist
- [ ] Backend gate passes: `just check` (format-check + lint + unit tests)
- [ ] Frontend gate passes (if touched): `just frontend-check` (prettier + eslint + build)
- [ ] DB schema changes also added to `versioning/sql/actual.sql` **and** a new `versioning/sql/versions/vN.sql`
- [ ] User-facing text added to `frontend/src/i18n/messages.js` in **both** EN and ES
- [ ] Tests added/updated for the change
- [ ] Kept `pena`/GUID API contracts intact (unless the task explicitly changes them)

## Notes for reviewers
<!-- Screenshots, migration steps, anything out of the ordinary. -->
