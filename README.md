# interactive.li

The public site for Interactive.li, served by GitHub Pages at
<https://interactive.li>.

Three pages, no build step, no dependencies. The repository *is* the deployed
site: whatever is committed here is what visitors get, so nothing needs
compiling, bundling or installing before a change goes live.

```
index.html         home page, translated into EN / DE / FR at runtime
poster.html        notes and references for the 2025 Klimatag poster (EN only)
404.html           served by Pages for any address that does not exist
css/style.css      the whole design; one stylesheet for all three pages
css/fonts.css      @font-face rules for the self-hosted fonts
js/i18n.js         the translation engine — knows nothing about this site
js/seo.js          canonical, og:url, og:locale, and ?lang= in the address bar
js/switcher.js     the language switcher: active state and click handling
js/main.js         boot: the order everything above happens in
js/i18n/{en,de,fr}.json    every word of visible copy on the home page
fonts/             self-hosted woff2; no third-party requests, ever
pdf/               session booklets linked from the home page
```

## How the two halves fit together

`index.html` owns the **structure**: which elements exist and in what order.
`js/i18n/*.json` owns the **words**. Nothing is generated — every element is
translated in place, by matching its `data-i18n` path against the locale file:

```html
<p class="exp-hook" data-i18n="experiences.items.beyond_coal.hook">English text</p>
```

The English text in the markup is a real fallback. It is what crawlers read
before scripts run, what a visitor sees if the locale file fails to load, and
what stays on screen for any key that has no translation yet.

So: **to change what appears or in what order, edit `index.html`. To change
wording, edit the locale files.** `poster.html` and `404.html` are English
only and hold their text inline.

Every key should exist in all three locale files. A locale with nothing to say
carries an empty string rather than dropping the key — that empty string is
what clears the element when a visitor switches back to that language.

## How the four scripts fit together

`main.js` is the only file that listens for `DOMContentLoaded`. The other three
publish functions — `window.i18nEngine`, `window.seoTags`, `window.langSwitcher`
— and do nothing until asked. So the sequence a page goes through is written
out in one place, and adding behaviour means adding a line to `main.js` rather
than another listener racing the others.

Load order in the markup follows that: engine, then the two it serves, then the
boot file.

## Adding a simulation

**1. Add an `<li>` to the list in `index.html`.** Copy an existing one and give
it a new slug — `beyond_coal` below. The slug is yours to pick; it just has to
match between the markup and the locale files.

```html
<li class="exp">
  <h3 class="exp-title" data-i18n="experiences.items.water_wars.title">Water Wars</h3>
  <p class="exp-hook" data-i18n="experiences.items.water_wars.hook">Allocate a shrinking river between farms, cities and a delta.</p>
</li>
```

**2. Add the same slug to `experiences.items` in all three locale files:**

```json
"water_wars": {
  "title": "Water Wars",
  "hook": "Allocate a shrinking river between farms, cities and a delta."
}
```

Skip step 2 and the session still appears — in English, in every language.
That is the intended way to publish something before its translations are
ready, not a bug.

**To reorder**, move the `<li>`. **To remove one**, delete the `<li>`; the
orphaned locale entries do no harm, but are worth deleting too.

### Sessions with a booklet

Wrap the title in a link and add a badge. The badge is hidden from screen
readers and the format goes into `link_label` instead, so the link's spoken
name carries it once rather than twice:

```html
<h3 class="exp-title"><a href="pdf/generations.pdf"
   data-i18n="experiences.items.generations.title"
   data-i18n-attr="aria-label:experiences.items.generations.link_label"
   aria-label="Generations (PDF, English)">Generations</a><span class="exp-tag"
   data-i18n="experiences.items.generations.pdf_label" aria-hidden="true">PDF, English</span></h3>
```

```json
"generations": {
  "title": "Generations",
  "hook": "…",
  "pdf_label": "PDF, English",
  "link_label": "Generations (PDF, English)"
}
```

`pdf_label` is how a booklet offered in one language only says so on its badge
— it reads "PDF, Englisch" on the German page.

## Adding a language

1. Add `js/i18n/xx.json`, with the same keys as `en.json`.
2. Add the code to `SUPPORTED_LANGUAGES` in `js/i18n.js`.
3. Add a locale to `OG_LOCALES` in `js/seo.js` (Open Graph wants `xx_XX`).
4. Add a `.lang-link` to the switcher and an `hreflang` link in `index.html`.
5. Add the URL and its alternates to `sitemap.xml`.

## Previewing

Open a server at the repository root — `file://` will not do, because the
locale files are fetched:

```bash
python3 -m http.server 8000
```

Then <http://localhost:8000/>. Append `?lang=de` or `?lang=fr` to pin a
language; the switcher writes that parameter itself once you use it. Note that
a choice is remembered in `localStorage`, so clear it if you want to test the
browser-language detection.

## Things worth knowing before changing them

- **No external requests at runtime.** Fonts are self-hosted and there is no
  analytics, no CDN and no embed. Keep it that way: it is why the site needs no
  cookie banner.
- **Nothing hides the copy.** Every page renders as it parses; no script has to
  run for the site to be readable. The consequence is that a German or French
  visitor may see the English fallback for a moment before the locale file
  lands — that is accepted, not a bug. Reintroducing a cover for it means
  hiding the article until a script un-hides it, which is a blank page whenever
  that script does not arrive.
- **The other locales are fetched after the first one is applied**
  (`i18nEngine.warmCache`, called from `main.js`), so switching language never
  waits on the network. It is deliberately the last thing to happen: earlier,
  and it would compete with the fetch the visitor is actually waiting for.
- **The switcher is hidden without scripting**, by a `<noscript>` rule in the
  head of `index.html` rather than in `style.css` — it has to sit after the
  stylesheet to win. Translation is client-side, so without scripting those
  links cannot deliver what they promise; `hreflang` and the sitemap still
  expose every language to crawlers.
- **Spacing between sections is padding, never margin** — each section draws
  its own `border-top`, and a margin would let two rules stack.
- **`--muted` is the lightest tone that still clears WCAG AA on both paper
  tones.** Lightening it fails.
- **`404.html` uses root-absolute paths.** Pages serves it for a bad URL at any
  depth, and relative paths would resolve against a directory that isn't there.
- **`?lang=en` canonicalises to the bare URL,** since English is the copy
  already in the markup. Two indexable URLs with identical text is the thing
  being avoided.
