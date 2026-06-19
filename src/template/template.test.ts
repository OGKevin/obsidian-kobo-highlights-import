import * as chai from "chai";
import { applyTemplateTransformations, defaultTemplate } from "./template";
import { chapter } from "../database/Highlight";
import { Bookmark } from "../database/interfaces";

describe("template", async function () {
	const testDate = new Date("2023-01-01T12:00:00Z");
	const chapters = new Map<chapter, Bookmark[]>([
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
	]);

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

## Personal Notes

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

## Personal Notes

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

	it("shorthand syntax {{Variable}}", async function () {
		const template = `# {{Title}} - {{Author}}

{{highlights}}`;
		const content = applyTemplateTransformations(template, chapters, {
			title: "test title",
			author: "test",
		});
		chai.expect(normalize(content)).equal(
			normalize(`# test title - test

## Chapter 1

test

*Created: 2023-01-01T12:00:00.000Z*

## Chapter 2

test2

**Note:** note2

*Created: 2023-01-01T12:00:00.000Z*`),
		);
	});

	it("mixed shorthand and Eta syntax", async function () {
		const template = `---
title: "{{Title}}"
author: {{Author}}
---
<% it.chapters.forEach(([chapterName, highlights]) => { -%>
## <%= chapterName %>
<% highlights.forEach(h => { -%>
<%= h.text %>
<% }) -%>
<% }) %>`;
		const content = applyTemplateTransformations(template, chapters, {
			title: "test title",
			author: "test",
		});
		chai.expect(normalize(content)).equal(
			normalize(`---
title: "test title"
author: test
---
## Chapter 1
test
## Chapter 2
test2`),
		);
	});

	it("user template with all shorthand fields", async function () {
		const template = `---
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

{{highlights}}`;
		const content = applyTemplateTransformations(template, chapters, {
			title: "Dune",
			author: "Frank Herbert",
			description: "A sci-fi novel",
			dateLastRead: new Date("2024-06-15T10:00:00Z"),
			isbn: "978-0441172719",
			readStatus: 2,
		});
		chai.expect(content).to.contain('title: "Dune"');
		chai.expect(content).to.contain('author: "Frank Herbert"');
		chai.expect(content).to.contain("2024-06-15T10:00:00.000Z");
		chai.expect(content).to.contain("isbn: 978-0441172719");
		chai.expect(content).to.contain("readStatus: Read");
		chai.expect(content).to.contain("A sci-fi novel");
		chai.expect(content).to.contain("## Chapter 1");
		chai.expect(content).to.contain("test");
	});

	it("shorthand syntax tolerates spaces from linters", async function () {
		const template = `---
title: "{{ Title }}"
isbn: { { ISBN } }
---
# {{Title}}

{ { highlights } }`;
		const content = applyTemplateTransformations(template, chapters, {
			title: "test title",
			author: "test",
			isbn: "123",
		});
		chai.expect(content).to.contain('title: "test title"');
		chai.expect(content).to.contain("isbn: 123");
		chai.expect(content).to.contain("## Chapter 1");
		chai.expect(content).to.contain("test");
	});

	it("template rendering error throws with message", async function () {
		const badTemplate = `<%= it.nonExistent.property.deep %>`;
		chai.expect(() =>
			applyTemplateTransformations(badTemplate, chapters, {
				title: "test",
				author: "test",
			}),
		).to.throw("Template rendering failed:");
	});
});
