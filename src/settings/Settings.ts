import { App, PluginSettingTab, Setting } from "obsidian";
import KoboHighlightsImporter from "src/main";
import { FileSuggestor } from "./suggestors/FileSuggestor";
import { FolderSuggestor } from "./suggestors/FolderSuggestor";

export const DEFAULT_SETTINGS: KoboHighlightsImporterSettings = {
	storageFolder: "",
	templatePath: "",
	importAllBooks: false,
};

export interface KoboHighlightsImporterSettings {
	storageFolder: string;
	templatePath: string;
	importAllBooks: boolean;
}

export class KoboHighlightsImporterSettingsTab extends PluginSettingTab {
	constructor(
		public app: App,
		private plugin: KoboHighlightsImporter,
	) {
		super(app, plugin);
	}

	display(): void {
		this.containerEl.empty();
		this.containerEl.createEl("h2", { text: this.plugin.manifest.name });

		this.add_destination_folder();
		this.add_template_path();
		this.add_import_all_books();
	}

	add_destination_folder(): void {
		new Setting(this.containerEl)
			.setName("Destination folder")
			.setDesc("Where to save your imported highlights")
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

	add_template_path(): void {
		new Setting(this.containerEl)
			.setName("Template Path")
			.setDesc("Which template to use for extracted highlights")
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

	add_import_all_books(): void {
		const desc = document.createDocumentFragment();
		desc.append(
			"When enabled, import information for all books from your Kobo device, not just books with highlights.",
			desc.createEl("br"),
			"This will include reading progress, status, and other metadata for every book.",
		);

		new Setting(this.containerEl)
			.setName("Import all books")
			.setDesc(desc)
			.addToggle((cb) => {
				cb.setValue(this.plugin.settings.importAllBooks).onChange(
					async (toggle) => {
						this.plugin.settings.importAllBooks = toggle;
						await this.plugin.saveSettings();
					},
				);
			});
	}
}
