# Plans index handling

A plans index is a table of contents for the plans folder. This skill adds one row for the plan it wrote. It **never creates an index** and never reorders or rewrites other rows.

## 1. Detect

Check in this order and use the first that exists:

1. `docs/plans/README.md`
2. `docs/plans/index.md`
3. A `README.md` or `index.md` in the plans folder that `AGENTS.md` or `CLAUDE.md` names, if that folder is not `docs/plans/`.

A file counts as an index only if it contains a table whose rows link to plan files. If a file exists but has no such table, treat it as no index.

## 2. Add one row

1. Read the whole index. Note the column headings and the order of rows.
2. Match its columns exactly. Fill each from the plan: the link (relative path to the file), the title, the type (`milestone` or `phase`), the status, and the source. If a column has no obvious value, write `-`.
3. Status for a new plan is `Draft`.
4. Insert the row where the existing rows suggest (usually the end, or in id order if the rows are sorted). Use a single `Edit` that adds the row.
5. Do not touch any other row, the heading, or the prose. Keep the table's alignment style. If the repo formats tables with Prettier, say that the user may need to run the formatter.

## 3. Cases

- **The plan is already listed.** Update only that row (for example the title or source), and say so.
- **The table cannot be parsed or the columns are unclear.** Leave the index unchanged, and tell the user the row to add and why you did not.
- **No index exists.** Write the plan, say that no index was found, and offer to create one. Create it only if the user says yes. Never create it unasked.

## 4. Report

State one of: the row was added, the row was updated, the index was left unchanged (and why), or no index was found (and the offer).
