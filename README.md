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

### Variables

The following variables are available in your template:

| Variable      | Type / Structure                     | Description                                                                                                                                                                                                                                                                                                                    |
| ------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bookDetails` | Object                               | Book metadata: <br>`title`, `author`, `publisher`, `dateLastRead`, `readStatus`, `percentRead`, `isbn`, `series`, `seriesNumber`, `timeSpentReading`, `description`                                                                                                                                                            |
| `chapters`    | Array of `[chapterName, highlights]` | Each `highlights` is an array of bookmarks for that chapter                                                                                                                                                                                                                                                                    |
| `ReadStatus`  | Enum mapping                         | Maps read status values to their string labels                                                                                                                                                                                                                                                                                 |
| `highlight`   | Object                               | Each highlight/bookmark:<br>- `bookmarkId`: Unique ID<br>- `text`: The raw highlight text<br>- `contentId`: Content identifier<br>- `note`: Optional note/annotation (if any)<br>- `dateCreated`: [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) when the highlight was created<br>- `color`: Optional color of the highlight (if any) (0 for yellow, 1 for red, 2 for blue, 3 for green) |

#### Example usage

```eta
<% it.chapters.forEach(([chapterName, highlights]) => { -%>
## <%= chapterName %>
<% highlights.forEach(h => { -%>
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

#### Template example using Obsidian callouts to display color of highlights

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

## Helping Screenshots

![](./README_assets/step1.png)
![](./README_assets/step2.png)
![](./README_assets/step3.png)
![](./README_assets/step4.png)

## Contributing

Please feel free to test, send feedbacks using Issues and open Pull Requests to improve the process.
