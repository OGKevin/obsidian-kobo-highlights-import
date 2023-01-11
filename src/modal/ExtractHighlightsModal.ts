import * as fs from 'fs';
import { App, Modal, normalizePath, Notice } from "obsidian";
import { sanitize } from 'sanitize-filename-ts';
import SqlJs from 'sql.js';
import { binary } from "src/binaries/sql-wasm";
import { HighlightService } from "src/database/Highlight";
import { Repository } from "src/database/repository";
import { KoboHighlightsImporterSettings } from "src/settings/Settings";
import { applyTemplateTransformations } from 'src/template/template';
import { getTemplateContents } from 'src/template/templateContents';

export class ExtractHighlightsModal extends Modal {
    goButtonEl!: HTMLButtonElement;
    inputFileEl!: HTMLInputElement

    settings: KoboHighlightsImporterSettings

    sqlFilePath: string | undefined

    constructor(
        app: App, settings: KoboHighlightsImporterSettings) {
        super(app);
        this.settings = settings
    }

    private async fetchHighlights() {
        if (!this.sqlFilePath) {
            throw new Error('No sqlite DB file selected...')
        }

        const SQLEngine = await SqlJs({
            wasmBinary: binary
        })
        const fileBuffer = fs.readFileSync(this.sqlFilePath)
        const db = new SQLEngine.Database(fileBuffer)

        const service: HighlightService = new HighlightService(
            new Repository(
                db
            )
        )

        const content = service.convertToMap(
            await service.getAllHighlight(),
            this.settings.includeCreatedDate,
            this.settings.dateFormat,
            this.settings.includeCallouts,
            this.settings.highlightCallout,
            this.settings.annotationCallout
        )

        const template = await getTemplateContents(this.app, this.settings.templatePath)

        for (const [bookTitle, chapters] of content) {
            const markdown = service.fromMapToMarkdown(bookTitle, chapters)
            const saniizedBookName = sanitize(bookTitle)
            const fileName = normalizePath(`${this.settings.storageFolder}/${saniizedBookName}.md`)
            this.app.vault.adapter.write(
                fileName,
                applyTemplateTransformations(template, markdown)
            )
        }
    }

    onOpen() {
        const { contentEl } = this;

        this.goButtonEl = contentEl.createEl('button');
        this.goButtonEl.textContent = 'Extract'
        this.goButtonEl.disabled = true;
        this.goButtonEl.setAttr('style', 'background-color: red; color: white')
        this.goButtonEl.addEventListener('click', () => {
            new Notice('Extracting highlights...')
            this.fetchHighlights()
                .then(() => {
                    new Notice('Highlights extracted!')
                    this.close()
                }).catch(e => {
                    console.log(e)
                    new Notice('Something went wrong... Check console for more details.')
                })
        }
        )

        this.inputFileEl = contentEl.createEl('input');
        this.inputFileEl.type = 'file'
        this.inputFileEl.accept = '.sqlite'
        this.inputFileEl.addEventListener('change', ev => {
            const filePath = (<any>ev).target.files[0].path;
            fs.access(filePath, fs.constants.R_OK, (err) => {
                if (err) {
                    new Notice('Selected file is not readable')
                } else {
                    this.sqlFilePath = filePath
                    this.goButtonEl.disabled = false
                    this.goButtonEl.setAttr('style', 'background-color: green; color: black')
                    new Notice('Ready to extract!')
                }
            })
        })

        const heading = contentEl.createEl('h2')
        heading.textContent = 'Sqlite file location'

        const description = contentEl.createEl('p')
        description.innerHTML = 'Please select your <em>KoboReader.sqlite</em> file from a connected device'

        contentEl.appendChild(heading)
        contentEl.appendChild(description)
        contentEl.appendChild(this.inputFileEl)
        contentEl.appendChild(this.goButtonEl)
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
