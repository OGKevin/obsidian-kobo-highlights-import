# Obsidian Kobo Highlight Importer

This plugin aims to make highlight import from Kobo devices easier.

- [Obsidian Kobo Highlight Importer](#obsidian-kobo-highlight-importer)
    - [How to use](#how-to-use)
    - [Templating](#templating)
        - [Variables](#variables)
        - [Template Syntax](#template-syntax)
    - [Helping Screenshots](#helping-screenshots)
    - [Contributing](#contributing)

## How to use

Once installed, the steps to import your highlights directly into the vault are:

1. Connect your Kobo device to PC using a proper USB cable
2. Check if it has mounted automatically, or mount it manually (e.g. open the root folder of your Kobo using a file
   manager)
3. Open the import window using the plugin button
4. Locate _KoboReader.sqlite_ in the _.kobo_ folder ( this folder is hidden, so if you don't see it you should enable
   hidden files view from system configs )
5. Extract

## Templating

The plugin uses [Eta.js](https://eta.js.org/) for templating. You can fully customize the output using Eta's template syntax. See the [Eta.js template syntax documentation](https://eta.js.org/docs/intro/template-syntax) for details.

The default template is:

```eta
---
title: "<%= it.bookDetails.title %>"
author: <%= it.bookDetails.author %>
publisher: <%= it.bookDetails.publisher ?? '' %>
dateLastRead: <%= it.bookDetails.dateLastRead?.toISOString() ?? '' %>
readStatus: <%= it.bookDetails.readStatus ? it.ReadStatus[it.bookDetails.readStatus] : it.ReadStatus[it.ReadStatus.Unknown] %>
percentRead: <%= it.bookDetails.percentRead ?? '' %>
isbn: <%= it.bookDetails.isbn ?? '' %>
series: <%= it.bookDetails.series ?? '' %>
seriesNumber: <%= it.bookDetails.seriesNumber ?? '' %>
timeSpentReading: <%= it.bookDetails.timeSpentReading ?? '' %>
---

# <%= it.bookDetails.title %>

## Description

<%= it.bookDetails.description ?? '' %>

## Highlights

<% it.hierarchicalChapters.forEach((chapter) => { -%>
<%= '#'.repeat(chapter.depth + 1) %> <%= chapter.title.trim() %>

<% chapter.highlights.forEach((highlight) => { -%>
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

### Variables

The following variables are available in your template:

| Variable               | Type / Structure | Description                                                                                                                                                                                                                                                                                                                    |
| ---------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bookDetails`          | Object           | Book metadata: <br>`title`, `author`, `publisher`, `dateLastRead`, `readStatus`, `percentRead`, `isbn`, `series`, `seriesNumber`, `timeSpentReading`, `description`                                                                                                                                                            |
| `hierarchicalChapters` | Array            | Array of chapter objects, each containing: <br>- `title`: Chapter/section name<br>- `depth`: Hierarchical depth level (1 = top-level chapter, 2 = section, 3 = subsection, etc.)<br>- `highlights`: Array of bookmarks for that chapter                                                                                       |
| `ReadStatus`           | Enum mapping     | Maps read status values to their string labels                                                                                                                                                                                                                                                                                 |
| `highlight`            | Object           | Each highlight/bookmark:<br>- `bookmarkId`: Unique ID<br>- `text`: The raw highlight text<br>- `contentId`: Content identifier<br>- `note`: Optional note/annotation (if any)<br>- `dateCreated`: [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) when the highlight was created |

#### Example usage

```eta
<% it.hierarchicalChapters.forEach((chapter) => { -%>
<%= '#'.repeat(chapter.depth + 1) %> <%= chapter.title %>

<% chapter.highlights.forEach(h => { -%>
<%= h.text %>

<% if (h.note) { -%>
**Note:** <%= h.note %>

<% } -%>
<% if (h.dateCreated) { -%>
*Created: <%= h.dateCreated.toISOString() %>*

<% } -%>
<% }) -%>
<% }) %>
```

The `'#'.repeat(chapter.depth + 1)` generates the appropriate markdown heading level:
- Depth 1 → `##` (Level 2 heading, since `#` is the book title)
- Depth 2 → `###` (Level 3 heading for subsections)
- Depth 3 → `####` (Level 4 heading for sub-subsections)

This preserves the hierarchical structure of your book's table of contents.

#### Date formatting examples

```eta
<!-- YYYY-MM-DD format -->
*Created: <%= h.dateCreated.getFullYear() %>-<%= String(h.dateCreated.getMonth() + 1).padStart(2, '0') %>-<%= String(h.dateCreated.getDate()).padStart(2, '0') %>*

<!-- Localized date -->
*Created: <%= h.dateCreated.toLocaleDateString() %>*

<!-- Localized date and time -->
*Created: <%= h.dateCreated.toLocaleString() %>*
```

For more advanced syntax, see the [Eta.js template syntax documentation](https://eta.js.org/docs/intro/template-syntax).

## Helping Screenshots

![](./README_assets/step1.png)
![](./README_assets/step2.png)
![](./README_assets/step3.png)
![](./README_assets/step4.png)

## Contributing

Please feel free to test, send feedbacks using Issues and open Pull Requests to improve the process.
