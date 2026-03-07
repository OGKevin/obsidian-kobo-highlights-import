import * as chai from "chai";
import { applyTemplateTransformations, defaultTemplate } from "./template";
import { ChapterEntry } from "../database/interfaces";

describe("template", async function () {
	const testDate = new Date("2023-01-01T12:00:00Z");
	const chapters: ChapterEntry[] = [
		{
			title: "Chapter 1",
			depth: 1,
			highlights: [
				{
					bookmarkId: "1",
					text: "test",
					contentId: "content1",
					volumeId: "book1",
					dateCreated: testDate,
				},
			],
		},
		{
			title: "Chapter 2",
			depth: 1,
			highlights: [
				{
					bookmarkId: "1",
					text: "test2",
					contentId: "content2",
					volumeId: "book1",
					dateCreated: testDate,
					note: "note2",
				},
			],
		},
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

<% it.chapters.forEach((chapter) => { %>
<%- chapter.highlights.forEach(h => { -%>
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

<% it.chapters.forEach((chapter) => { -%>
<%= '#'.repeat(chapter.depth + 1) %> <%= chapter.title %>

<% chapter.highlights.forEach(h => { -%>
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
});
