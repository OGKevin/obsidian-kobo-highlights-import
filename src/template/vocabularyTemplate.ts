import { Eta } from "eta";
import { Word } from "../database/interfaces";

const eta = new Eta({ autoEscape: false, autoTrim: false });

const defaultVocabularyTemplate = `
---
title: "Kobo Vocabulary"
date_updated: "<%= it.dateUpdated %>"
---

# Kobo Vocabulary

<%= it.words.length %> words

<% it.words.forEach((word) => { -%>
- **<%= word.text %>**<% if (word.dictSuffix) { %> (<%= word.dictSuffix.replace(/^-/, '') %>)<% } %><% if (word.dateCreated) { %> — _<%= word.dateCreated.toISOString().split('T')[0] %>_<% } %>
<% }) %>

## Personal Notes
`;

export function applyVocabularyTemplate(words: Word[]): string {
	const rendered = eta.renderString(defaultVocabularyTemplate, {
		words,
		dateUpdated: new Date().toISOString(),
	});

	if (rendered === null) {
		throw new Error("Vocabulary template rendering failed");
	}

	return rendered.trim();
}
