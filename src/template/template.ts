import { BookDetails, ReadStatus } from "../database/interfaces"

export const defaultTemplate = `
---
title: {{Title}}
author: {{Author}}
publisher: {{Publisher}}
dateLastRead: {{DateLastRead}}
readStatus: {{ReadStatus}}
percentRead: {{PercentRead}}
isbn: {{ISBN}}
series: {{Series}}
seriesNumber: {{SeriesNumber}}
timeSpentReading: {{TimeSpentReading}}
---

# {{Title}}

## Description

{{Description}}

## Highlights

{{highlights}}
`

export function applyTemplateTransformations(
	rawTemplate: string,
	highlights: string,
	bookDetails: BookDetails,
): string {
	return rawTemplate
		.replace(
			/{{\s*Title\s*}}/gi,
			bookDetails.title,
		)
		.replace(
			/{{\s*Author\s*}}/gi,
			bookDetails.author,
		)
		.replace(
			/{{\s*Publisher\s*}}/gi,
			bookDetails.publisher ?? '',
		)
		.replace(
			/{{\s*DateLastRead\s*}}/gi,
			bookDetails.dateLastRead?.toISOString() ?? '',
		)
		.replace(
			/{{\s*ReadStatus\s*}}/gi,
			ReadStatus[bookDetails.readStatus ?? ReadStatus.Unknown],
		)
		.replace(
			/{{\s*PercentRead\s*}}/gi,
			bookDetails.percentRead?.toString() ?? '',
		)
		.replace(
			/{{\s*ISBN\s*}}/gi,
			bookDetails.isbn ?? '',
		)
		.replace(
			/{{\s*Series\s*}}/gi,
			bookDetails.series ?? '',
		)
		.replace(
			/{{\s*SeriesNumber\s*}}/gi,
			bookDetails.seriesNumber?.toString() ?? '',
		)
		.replace(
			/{{\s*TimeSpentReading\s*}}/gi,
			bookDetails.timeSpentReading?.toString() ?? '',
		)
		.replace(
			/{{\s*Description\s*}}/gi,
			bookDetails.description ?? '',
		)
		.replace(
			/{{\s*highlights\s*}}/gi,
			highlights,
		)
		.trim()
}
