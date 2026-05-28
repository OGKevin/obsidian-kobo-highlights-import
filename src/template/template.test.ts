import * as chai from "chai";
import { applyTemplateTransformations, defaultTemplate } from "./template";
import { HighlightService, chapter } from "../database/Highlight";
import { Bookmark, Highlight } from "../database/interfaces";

describe("template", async function () {
	const testDate = new Date("2023-01-01T12:00:00Z");
	const chapters: [chapter, Bookmark[]][] = [
		[
			"Chapter 1",
			[
				{
					bookmarkId: "1",
					text: "test",
					contentId: "content1",
					dateCreated: testDate,
				},
			],
		],

		[
			"Chapter 2",
			[
				{
					bookmarkId: "1",
					text: "test2",
					contentId: "content2",
					dateCreated: testDate,
					note: "note2",
				},
			],
		],
	];

	function normalize(s: string) {
		return s
			.replace(/\r\n/g, "\n")
			.split("\n")
			.map((line) => line.trimEnd())
			.join("\n")
			.trim();
	}

	it("applyTemplateTransformations default", async function () {
		const content = applyTemplateTransformations(
			defaultTemplate,
			chapters,
			{
				title: "test title",
				author: "test",
			},
		);
		chai.expect(normalize(content)).equal(
			normalize(
				`---
title: "test title"
author: test
publisher: 
dateLastRead: 
readStatus: Unknown
percentRead: 
isbn: 
series: 
seriesNumber: 
timeSpentReading: 
---

# test title

## Description



## Highlights

## Chapter 1

test

*Created: 2023-01-01T12:00:00.000Z*

## Chapter 2

test2

**Note:** note2

*Created: 2023-01-01T12:00:00.000Z*`,
			),
		);
	});

	const templates = new Map<string, string[]>([
		[
			"default",
			[
				defaultTemplate,
				`---
title: "test title"
author: test
publisher: 
dateLastRead: 
readStatus: Unknown
percentRead: 
isbn: 
series: 
seriesNumber: 
timeSpentReading: 
---

# test title

## Description



## Highlights

## Chapter 1

test

*Created: 2023-01-01T12:00:00.000Z*

## Chapter 2

test2

**Note:** note2

*Created: 2023-01-01T12:00:00.000Z*`,
			],
		],
		[
			"with front matter",
			[
				`
---
tag: [tags]
title: <%= it.bookDetails.title %>
---
# <%= it.bookDetails.title %>

<% it.chapters.forEach(([chapterName, highlights]) => { %>
<%- highlights.forEach(h => { -%>
<%= h.text %>
<% }) %>
<% }) %>`,
				`---
tag: [tags]
title: test title
---
# test title

test

test2
`,
			],
		],
		[
			"with date formatting",
			[
				`
---
title: "<%= it.bookDetails.title %>"
---

# <%= it.bookDetails.title %>

<% it.chapters.forEach(([chapterName, highlights]) => { -%>
## <%= chapterName %>

<% highlights.forEach(h => { -%>
<%= h.text %>

*Created: <%= h.dateCreated.getFullYear() %>-<%= String(h.dateCreated.getMonth() + 1).padStart(2, '0') %>-<%= String(h.dateCreated.getDate()).padStart(2, '0') %>*

<% }) -%>
<% }) %>`,
				`---
title: "test title"
---

# test title

## Chapter 1

test

*Created: 2023-01-01*

## Chapter 2

test2

*Created: 2023-01-01*
`,
			],
		],
	]);

	for (const [title, t] of templates) {
		it(`applyTemplateTransformations ${title}`, async function () {
			const content = applyTemplateTransformations(t[0], chapters, {
				title: "test title",
				author: "test",
			});
			chai.expect(normalize(content)).equal(normalize(t[1]));
		});
	}

	it("buildChapterList keeps duplicate chapter titles separate", async function () {
		const highlights: Highlight[] = [
			{
				bookmark: { bookmarkId: "1", text: "highlight in part one", contentId: "c1", dateCreated: testDate },
				content: { title: "Chapter 1", contentId: "c1", bookTitle: "1984", chapterIdBookmarked: "true" },
			},
			{
				bookmark: { bookmarkId: "2", text: "highlight in part two", contentId: "c2", dateCreated: testDate },
				content: { title: "Chapter 1", contentId: "c2", bookTitle: "1984", chapterIdBookmarked: "true" },
			},
		];

		const service = new HighlightService(null as any);
		const dedupChapters = service.buildChapterList(highlights);

		chai.expect(dedupChapters).to.have.length(2);
		chai.expect(dedupChapters[0][0]).to.equal("Chapter 1");
		chai.expect(dedupChapters[1][0]).to.equal("Chapter 1");

		const content = applyTemplateTransformations(
			defaultTemplate,
			dedupChapters,
			{ title: "1984", author: "George Orwell" },
		);

		const normalized = normalize(content);
		const headings = normalized.match(/^## Chapter 1$/gm);
		chai.expect(headings).to.have.length(2);
		chai.expect(normalized).to.include("highlight in part one");
		chai.expect(normalized).to.include("highlight in part two");
	});
});
