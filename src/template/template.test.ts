import * as chai from 'chai'
import { applyTemplateTransformations, defaultTemplate } from './template'

describe('template', async function () {
	it('applyTemplateTransformations default', async function () {
		const content = applyTemplateTransformations(defaultTemplate, 'test', {
			title: 'test title',
			author: 'test'
		})

		chai.expect(content).deep.eq(
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

test`
		)
	})

	const templates = new Map<string, string[]>([
		[
			'default',
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

test`
			]
		],
		[
			'with front matter',
			[
				`
---
tag: [tags]
title: {{title}}
---
# {{title}}

{{highlights}}`,
				`---
tag: [tags]
title: test title
---
# test title

test`
			]
		]
	])

	for (const [title, t] of templates) {
		it(`applyTemplateTransformations ${title}`, async function () {
			const content = applyTemplateTransformations(t[0], 'test', {
				title: 'test title',
				author: 'test'
			})

			chai.expect(content).deep.eq(t[1])
		})
	}
})
