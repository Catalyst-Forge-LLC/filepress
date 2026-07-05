---
title: "Writing from your phone"
date: 2026-06-28
updated: 2026-07-01
description: The whole editing workflow is just the GitHub mobile app and a text box.
tags: [workflow, downpress]
---

The editing surface for this blog is deliberately boring: a text box in the
GitHub mobile app. You create or open a `.md` file under `/posts/`, type, and
commit. A build runs and the site updates a couple of minutes later.

Because the phone keyboard likes to "help", the build is strict on your behalf:

- Missing a `title` or `date`? The build fails and names the file.
- Typed a date like `07/01/2026`? Rejected — dates must be `YYYY-MM-DD`.
- Two files that resolve to the same slug? The build names both.

None of that silently ships a broken post, which is exactly what you want when
your only tool is a plain text field.
