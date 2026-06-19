# Obsidian Kobo Highlight Importer

This plugin imports highlights and vocabulary from Kobo e-readers into your Obsidian vault.

- [Obsidian Kobo Highlight Importer](#obsidian-kobo-highlight-importer)
    - [How to use](#how-to-use)
    - [Non-destructive sync](#non-destructive-sync)
    - [Vocabulary import (My Words)](#vocabulary-import-my-words)
    - [Templating](#templating)
        - [Simple syntax](#simple-syntax)
        - [Eta syntax](#eta-syntax)
        - [Variables](#variables)
    - [Settings](#settings)
    - [Helping Screenshots](#helping-screenshots)
    - [Contributing](#contributing)

## How to use

Once installed, the steps to import your highlights directly into the vault are:

1. Connect your Kobo device to PC using a proper USB cable
2. Check if it has mounted automatically, or mount it manually (e.g. open the root folder of your Kobo using a file
   manager)
3. Open the import window using the plugin button
4. Locate _KoboReader.sqlite_ in the _.kobo_ folder (this folder is hidden, so if you don't see it you should enable
   hidden files view from system configs)
5. Click Extract

The plugin remembers the path to your KoboReader.sqlite file between sessions. On subsequent imports, it will auto-load the file without needing to re-select it. You can clear the remembered path in settings.

## Non-destructive sync

When you re-import highlights, the plugin preserves any personal content you've added to your book notes. Each generated file includes a `## Personal Notes` section at the bottom — everything under this heading is kept intact across re-imports.

The plugin regenerates everything above (frontmatter, highlights, description) from the Kobo database, so your highlights are always up to date while your personal notes remain untouched.

## Vocabulary import (My Words)

The plugin can import words you've looked up on your Kobo device (the "My Words" feature). Enable this in settings with the **Import vocabulary** toggle.

All vocabulary words are saved to a single file (default: `Kobo Vocabulary.md`) in your destination folder. The file includes each word with its dictionary language and the date it was looked up. Like book notes, the vocabulary file supports non-destructive sync with a Personal Notes section.

## Templating

You can customize the output format using templates. The plugin supports two syntax styles that can be mixed freely.

### Simple syntax

Use `{{Variable}}` shorthand for common fields:

```
---
title: "{{Title}}"
author: "{{Author}}"
date_created: "{{DateLastRead}}"
isbn: {{ISBN}}
readStatus: {{ReadStatus}}
---

# {{Title}} - {{Author}}

## Description

{{Description}}

## Highlights

{{highlights}}
```

Available shorthand variables:

| Shorthand | Description |
| --- | --- |
| `{{Title}}` | Book title |
| `{{Author}}` | Book author |
| `{{Description}}` | Book description |
| `{{DateLastRead}}` | Last read date (ISO format) |
| `{{ISBN}}` | ISBN number |
| `{{ReadStatus}}` | Read status label (Unknown, Unopened, Reading, Read) |
| `{{Publisher}}` | Publisher name |
| `{{Series}}` | Series name |
| `{{SeriesNumber}}` | Number in series |
| `{{PercentRead}}` | Reading progress percentage |
| `{{TimeSpentReading}}` | Time spent reading (seconds) |
| `{{highlights}}` | Full highlights section with chapters, text, notes, and dates |

### Eta syntax

For full control, use [Eta.js](https://eta.js.org/) template syntax. All template data is available under `it.*`:

```eta
---
title: "<%= it.bookDetails.title %>"
author: <%= it.bookDetails.author %>
---

# <%= it.bookDetails.title %>

<% it.chapters.forEach(([chapterName, highlights]) => { -%>
## <%= chapterName.trim() %>

<% highlights.forEach((highlight) => { -%>
<%= highlight.text %>

<% if (highlight.note) { -%>
**Note:** <%= highlight.note %>

<% } -%>
<% if (highlight.dateCreated) { -%>
*Created: <%= highlight.dateCreated.toISOString() %>*

<% } -%>
<% }) -%>
<% }) %>
```

You can mix both syntaxes in the same template. See the [Eta.js template syntax documentation](https://eta.js.org/docs/intro/template-syntax) for the full Eta reference.

### Variables

The following variables are available in Eta templates:

| Variable | Type / Structure | Description |
| --- | --- | --- |
| `bookDetails` | Object | Book metadata: `title`, `author`, `publisher`, `dateLastRead`, `readStatus`, `percentRead`, `isbn`, `series`, `seriesNumber`, `timeSpentReading`, `description` |
| `chapters` | Array of `[chapterName, highlights]` | Each `highlights` is an array of bookmarks for that chapter |
| `ReadStatus` | Enum mapping | Maps read status values to their string labels |
| `highlight` | Object | Each highlight/bookmark: `bookmarkId`, `text`, `contentId`, `note` (optional annotation), `dateCreated` ([Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)), `color` (optional: 0=yellow, 1=red, 2=blue, 3=green) |

#### Date formatting examples

```eta
<!-- YYYY-MM-DD format -->
*Created: <%= h.dateCreated.getFullYear() %>-<%= String(h.dateCreated.getMonth() + 1).padStart(2, '0') %>-<%= String(h.dateCreated.getDate()).padStart(2, '0') %>*

<!-- Localized date -->
*Created: <%= h.dateCreated.toLocaleDateString() %>*

<!-- Localized date and time -->
*Created: <%= h.dateCreated.toLocaleString() %>*
```

#### Template example using Obsidian callouts to display color of highlights

```eta
---
title: "<%= it.bookDetails.title %>"
author: <%= it.bookDetails.author %>
---

# <%= it.bookDetails.title %>

## Description

<%= it.bookDetails.description?.replace(/<[^>]*>/g, '') ?? '' %>

## Highlights

<% it.chapters.forEach(([chapterName, highlights]) => { -%>
### <%= chapterName.trim() %>

<% highlights.forEach((highlight) => { const calloutMap = {'1': 'failure', '2': 'info', '3': 'success'}; const calloutType = calloutMap[highlight.color] ?? 'quote'; const calloutText = highlight.text.split('\n').map(line => '> ' + line).join('\n'); -%>
> [!<%= calloutType %>]
<%= calloutText %>

<% if (highlight.note) { -%>
**Note:** <%= highlight.note %>

<% } -%>
<% }) -%>
<% }) %>
```

## Settings

| Setting | Description | Default |
| --- | --- | --- |
| **Destination folder** | Where to save imported highlights | _(vault root)_ |
| **Kobo SQLite path** | Remembered path to KoboReader.sqlite (auto-saved, read-only) | _(not set)_ |
| **Template Path** | Path to a custom template file in your vault | _(default template)_ |
| **Sort by chapter progress** | Sort highlights by position in book instead of creation date | Off |
| **Import all books** | Import metadata for all books, not just those with highlights | Off |
| **Import vocabulary** | Import looked-up words from Kobo's My Words feature | Off |
| **Vocabulary file name** | Name of the vocabulary file (without .md extension) | Kobo Vocabulary |

## Helping Screenshots

![](./README_assets/step1.png)
![](./README_assets/step2.png)
![](./README_assets/step3.png)
![](./README_assets/step4.png)

## Contributing

Please feel free to test, send feedback using Issues and open Pull Requests to improve the process.
