# Icons

Official icon files, copied in as plain SVG so the site needs no icon packages.
Each file keeps its source and license in a comment on its first line.

| File | Source | License |
| --- | --- | --- |
| `github.svg` (mark-github), `mail.svg`, `organization.svg`, `mortar-board.svg`, `book.svg` | [Octicons](https://github.com/primer/octicons) by GitHub, v19.38.0 | MIT, Copyright (c) 2026 GitHub Inc. |
| `linkedin.svg` | [Font Awesome Free](https://fontawesome.com) 7.3.1 (brands: linkedin) | Icons: CC BY 4.0, Copyright 2026 Fonticons, Inc. |

`Icon.tsx` inlines a file by name, so it takes the surrounding text color.
To add one, save the official SVG here with `fill="currentColor"` and its license comment, then add it to `ICONS`.
