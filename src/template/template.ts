import { Eta } from "eta";
import { BookDetails, ReadStatus, Bookmark } from "../database/interfaces";
import { chapter } from "../database/Highlight";

const eta = new Eta({ autoEscape: false, autoTrim: false });

const HIGHLIGHTS_BLOCK = `<% it.chapters.forEach(([chapterName, highlights]) => { -%>
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
<% }) %>`;

const SHORTHAND_MAP: Record<string, string> = {
	Title: "<%= it.bookDetails.title %>",
	Author: "<%= it.bookDetails.author %>",
	Description: "<%= it.bookDetails.description ?? '' %>",
	DateLastRead: "<%= it.bookDetails.dateLastRead?.toISOString() ?? '' %>",
	ISBN: "<%= it.bookDetails.isbn ?? '' %>",
	ReadStatus:
		"<%= it.bookDetails.readStatus != null ? it.ReadStatus[it.bookDetails.readStatus] : '' %>",
	Publisher: "<%= it.bookDetails.publisher ?? '' %>",
	Series: "<%= it.bookDetails.series ?? '' %>",
	SeriesNumber: "<%= it.bookDetails.seriesNumber ?? '' %>",
	PercentRead: "<%= it.bookDetails.percentRead ?? '' %>",
	TimeSpentReading: "<%= it.bookDetails.timeSpentReading ?? '' %>",
};

function preprocessShorthandSyntax(template: string): string {
	let result = template;

	result = result.replace(/\{\{highlights\}\}/gi, HIGHLIGHTS_BLOCK);

	for (const [key, etaCode] of Object.entries(SHORTHAND_MAP)) {
		result = result.replaceAll(`{{${key}}}`, etaCode);
	}

	return result;
}

export const defaultTemplate = `
---
title: "<%= it.bookDetails.title %>"
author: <%= it.bookDetails.author %>
publisher: <%= it.bookDetails.publisher ?? '' %>
dateLastRead: <%= it.bookDetails.dateLastRead?.toISOString() ?? '' %>
readStatus: <%= it.bookDetails.readStatus != null ? it.ReadStatus[it.bookDetails.readStatus] : it.ReadStatus[it.ReadStatus.Unknown] %>
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

${HIGHLIGHTS_BLOCK}

## Personal Notes
`;

export function applyTemplateTransformations(
	rawTemplate: string,
	chapters: Map<chapter, Bookmark[]>,
	bookDetails: BookDetails,
): string {
	const processed = preprocessShorthandSyntax(rawTemplate);
	const chaptersArr = Array.from(chapters.entries());

	let rendered: string;
	try {
		const result = eta.renderString(processed, {
			bookDetails,
			chapters: chaptersArr,
			ReadStatus,
		});
		if (result === null) {
			throw new Error("renderString returned null");
		}
		rendered = result;
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		throw new Error(`Template rendering failed: ${msg}`);
	}

	return rendered.trim();
}
