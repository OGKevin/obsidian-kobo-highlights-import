import { App, PluginSettingTab, Setting } from "obsidian";
import KoboHighlightsImporter from "src/main";
import { FileSuggestor } from "./suggestors/FileSuggestor";
import { FolderSuggestor } from "./suggestors/FolderSuggestor";

export const DEFAULT_SETTINGS: KoboHighlightsImporterSettings = {
    storageFolder: '',
    includeCreatedDate: false,
    dateFormat: "YYYY-MM-DD",
    templatePath: "",
}

export interface KoboHighlightsImporterSettings {
    storageFolder: string;
    includeCreatedDate: boolean;
    dateFormat: string;
    templatePath: string;
}

export class KoboHighlightsImporterSettingsTab extends PluginSettingTab {
    constructor(public app: App, private plugin: KoboHighlightsImporter) {
        super(app, plugin);
    }

    display(): void {
        this.containerEl.empty();
        this.containerEl.createEl('h2', { text: this.plugin.manifest.name });

        this.add_destination_folder();
        this.add_enable_creation_date();
        this.add_date_fromat();
        this.add_temaplte_path();
    }

    add_destination_folder(): void {
        new Setting(this.containerEl)
            .setName('Destination folder')
            .setDesc('Where to save your imported highlights')
            .addSearch((cb) => {
                new FolderSuggestor(this.app, cb.inputEl);
                cb.setPlaceholder("Example: folder1/folder2")
                    .setValue(this.plugin.settings.storageFolder)
                    .onChange((newFolder) => {
                        this.plugin.settings.storageFolder = newFolder;
                        this.plugin.saveSettings();
                    });
            });
    }

    add_temaplte_path(): void {
        new Setting(this.containerEl)
            .setName('Tempalte Path')
            .setDesc('Which tempalte to use for extracted highlights')
            .addSearch((cb) => {
                new FileSuggestor(this.app, cb.inputEl);
                cb.setPlaceholder("Example: folder1/template")
                    .setValue(this.plugin.settings.templatePath)
                    .onChange((newTemplatePath) => {
                        this.plugin.settings.templatePath = newTemplatePath;
                        this.plugin.saveSettings();
                    });
            });
    }

    add_enable_creation_date(): void {
        new Setting(this.containerEl)
            .setName("Add creation date")
            .setDesc(`If the exported higlights should include '- [[${this.plugin.settings.dateFormat}]]'`)
            .addToggle((cb) => {
                cb.setValue(this.plugin.settings.includeCreatedDate)
                    .onChange((toggle) => {
                        this.plugin.settings.includeCreatedDate = toggle;
                        this.plugin.saveSettings();
                    })
            })
    }

    add_date_fromat(): void {
        new Setting(this.containerEl)
            .setName("Date format")
            .setDesc("The format of date to use")
            .addMomentFormat((cb) => {
                cb.setPlaceholder("YYYY-MM-DD")
                    .setValue(this.plugin.settings.dateFormat)
                    .onChange((format) => {
                        this.plugin.settings.dateFormat = format;
                        this.plugin.saveSettings();
                    })
            })
    }
}
