import * as chai from 'chai';
import { applyTemplateTransformations, defaultTemplate } from './template';


describe('template', async function () {
  it('applyTemplateTransformations default', async function () {
    const content = applyTemplateTransformations(defaultTemplate, "test")

    chai.expect(content).deep.eq("test")
  });

  const templates = new Map<string, string[]>([
    [
      "default",
      [defaultTemplate, "test"]
    ],
    [
      "with front matter",
      [
        `
---
tag: [tags]
---
{{highlights}}
`,
        `---
tag: [tags]
---
test`
      ]
    ],
  ])

  for (const [title, t] of templates) {
    it(`applyTemplateTransformations ${title}`, async function () {
      const content = applyTemplateTransformations(t[0], "test")

      chai.expect(content).deep.eq(t[1])
    });
  }


});
