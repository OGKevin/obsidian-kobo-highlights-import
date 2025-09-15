import { Eta } from "eta";
import { BookDetails, ReadStatus, Bookmark } from "../database/interfaces";
import { chapter } from "../database/Highlight";

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
`;

export function applyTemplateTransformations(
	rawTemplate: string,
	chapters: Map<chapter, Bookmark[]>,
	bookDetails: BookDetails,
): string {
	const chaptersArr = Array.from(chapters.entries());
	const rendered = eta.renderString(rawTemplate, {
		bookDetails,
		chapters: chaptersArr,
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
