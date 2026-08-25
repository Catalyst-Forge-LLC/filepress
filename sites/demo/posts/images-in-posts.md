---
title: "Images in posts"
date: 2026-07-10
description: How FilePress turns a lone image plus a title into a figure with a caption.
tags: [filepress, notes]
---

Keep images next to the post they belong to:

```text
static/images/posts/<slug>/photo.jpg
```

Then link them with a site-root path. This post’s slug is `images-in-posts`, so the file lives at `static/images/posts/images-in-posts/figure.svg` and is referenced as `/images/posts/images-in-posts/figure.svg`.

![A stacked manuscript beside a photograph](/images/posts/images-in-posts/figure.svg "Lone image plus a title attribute becomes a figure with a caption")

A caption is the Markdown title attribute. An image that sits alone on a line becomes a `<figure>`; surrounding text stays ordinary Markdown.

`filepress new "Images in posts"` stamps the dated file; you still add the image folder yourself.
