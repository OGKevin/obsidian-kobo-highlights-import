// Inspired by https://github.com/liamcain/obsidian-periodic-notes/blob/04965a1e03932d804f6dd42c2e5dba0ede010d79/src/utils.ts
import { App, normalizePath, Notice } from "obsidian";

const defaultTemaple = `
{{highlights}}
`

export async function getTemplateContents(
    app: App,
    templatePath: string | undefined
): Promise<string> {
    const { metadataCache, vault } = app;
    const normalizedTemplatePath = normalizePath(templatePath ?? "");
    if (normalizedTemplatePath === "/") {
        return defaultTemaple;
    }

    try {
        const templateFile = metadataCache.getFirstLinkpathDest(normalizedTemplatePath, "");
        return templateFile ? vault.cachedRead(templateFile) : defaultTemaple;
    } catch (err) {
        console.error(
            `Failed to read the kobo highlight exporter template '${normalizedTemplatePath}'`,
            err
        );
        new Notice("Failed to read the kobo highlight exporter template");
        return "";
    }
}

export function applyTemplateTransformations(rawTemaple: string, highlights: string): string {
    return rawTemaple.replace(/{{\s*highlights\s*}}/gi, highlights)
}
