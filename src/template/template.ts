import { Eta } from "eta";
import { BookDetails, ChapterEntry, ReadStatus } from "../database/interfaces";

const eta = new Eta({ autoEscape: false, autoTrim: false });

export const defaultTemplate = `
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

<% it.chapters.forEach((chapter) => { -%>
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
`;

export function applyTemplateTransformations(
	rawTemplate: string,
	chapters: ChapterEntry[],
	bookDetails: BookDetails,
): string {
	const rendered = eta.renderString(rawTemplate, {
		bookDetails,
		chapters,
		ReadStatus,
	});

	if (rendered === null) {
		console.error(
			"Template rendering failed: eta.renderString returned null.",
		);

		return "Error: Template rendering failed. Check console for details.";
	}

	return rendered.trim();
}
