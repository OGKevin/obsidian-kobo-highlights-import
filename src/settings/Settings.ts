import { App, PluginSettingTab, Setting } from "obsidian";
import KoboHighlightsImporter from "src/main";
import { FileSuggestor } from "./suggestors/FileSuggestor";
import { FolderSuggestor } from "./suggestors/FolderSuggestor";

export const DEFAULT_SETTINGS: KoboHighlightsImporterSettings = {
	storageFolder: "",
	sortByChapterProgress: false,
	templatePath: "",
	importAllBooks: false,
	importArticles: false,
};

export interface KoboHighlightsImporterSettings {
	storageFolder: string;
	sortByChapterProgress: boolean;
	templatePath: string;
	importAllBooks: boolean;
	importArticles: boolean;
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
		this.add_sort_by_chapter_progress();
		this.add_import_all_books();
		if (this.plugin.settings.importAllBooks) {
			this.add_import_articles();
		}
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

	add_sort_by_chapter_progress(): void {
		const desc = document.createDocumentFragment();
		desc.append(
			"Turn on to sort highlights by chapter progess. If turned off, highlights are sorted by creation date and time.",
		);

		new Setting(this.containerEl)
			.setName("Sort by chapter progress")
			.setDesc(desc)
			.addToggle((cb) => {
				cb.setValue(
					this.plugin.settings.sortByChapterProgress,
				).onChange((toggle) => {
					this.plugin.settings.sortByChapterProgress = toggle;
					this.plugin.saveSettings();
				});
			});
	}

	add_import_all_books(): void {
		const desc = document.createDocumentFragment();
		desc.append(
			"When enabled, import information for all books and articles from your Kobo device, not just items with highlights.",
			desc.createEl("br"),
			"This will include reading progress, status, and other metadata for every book and Instapaper article.",
		);

		new Setting(this.containerEl)
			.setName("Import all books and articles")
			.setDesc(desc)
			.addToggle((cb) => {
				cb.setValue(this.plugin.settings.importAllBooks).onChange(
					async (toggle) => {
						this.plugin.settings.importAllBooks = toggle;
						if (toggle) {
							this.plugin.settings.importArticles = true;
						}
						await this.plugin.saveSettings();
						this.display();
					},
				);
			});
	}

	add_import_articles(): void {
		const desc = document.createDocumentFragment();
		desc.append(
			"Import all Instapaper articles",
		);

		new Setting(this.containerEl)
			.setName("Import Instapaper articles")
			.setDesc(desc)
			.addToggle((cb) => {
				cb.setValue(this.plugin.settings.importArticles).onChange(
					async (toggle) => {
						this.plugin.settings.importArticles = toggle;
						await this.plugin.saveSettings();
					},
				);
			});
	}
}
