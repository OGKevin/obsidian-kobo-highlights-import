import { App, PluginSettingTab, Setting } from "obsidian";
import KoboHighlightsImporter from "src/main";
import { FileSuggestor } from "./suggestors/FileSuggestor";
import { FolderSuggestor } from "./suggestors/FolderSuggestor";

export const DEFAULT_SETTINGS: KoboHighlightsImporterSettings = {
	storageFolder: "",
	sortByChapterProgress: false,
	templatePath: "",
	importAllBooks: false,
	importVocabulary: false,
	vocabularyFilePath: "Kobo Vocabulary",
	sqlitePath: "",
};

export interface KoboHighlightsImporterSettings {
	storageFolder: string;
	sortByChapterProgress: boolean;
	templatePath: string;
	importAllBooks: boolean;
	importVocabulary: boolean;
	vocabularyFilePath: string;
	sqlitePath: string;
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
		this.add_sqlite_path();
		this.add_template_path();
		this.add_sort_by_chapter_progress();
		this.add_import_all_books();
		this.add_import_vocabulary();
		this.add_vocabulary_file_path();
	}

	add_destination_folder(): void {
		new Setting(this.containerEl)
			.setName("Destination folder")
			.setDesc("Where to save your imported highlights")
			.addSearch((cb) => {
				new FolderSuggestor(this.app, cb.inputEl);
				cb.setPlaceholder("Example: folder1/folder2")
					.setValue(this.plugin.settings.storageFolder)
					.onChange(async (newFolder) => {
						this.plugin.settings.storageFolder = newFolder;
						await this.plugin.saveSettings();
					});
			});
	}

	add_sqlite_path(): void {
		new Setting(this.containerEl)
			.setName("Kobo SQLite path")
			.setDesc(
				"Remembered path to KoboReader.sqlite. Cleared automatically if the file is not found at this location.",
			)
			.addText((cb) => {
				cb.setDisabled(true).setValue(
					this.plugin.settings.sqlitePath || "(not set)",
				);
			})
			.addButton((cb) => {
				cb.setButtonText("Clear").onClick(async () => {
					this.plugin.settings.sqlitePath = "";
					await this.plugin.saveSettings();
					this.display();
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
					.onChange(async (newTemplatePath) => {
						this.plugin.settings.templatePath = newTemplatePath;
						await this.plugin.saveSettings();
					});
			});
	}

	add_sort_by_chapter_progress(): void {
		const desc = document.createDocumentFragment();
		desc.append(
			"Turn on to sort highlights by chapter progress. If turned off, highlights are sorted by creation date and time.",
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

	add_import_vocabulary(): void {
		new Setting(this.containerEl)
			.setName("Import vocabulary")
			.setDesc(
				"Import looked-up words from your Kobo's My Words feature",
			)
			.addToggle((cb) => {
				cb.setValue(
					this.plugin.settings.importVocabulary,
				).onChange(async (toggle) => {
					this.plugin.settings.importVocabulary = toggle;
					await this.plugin.saveSettings();
				});
			});
	}

	add_vocabulary_file_path(): void {
		new Setting(this.containerEl)
			.setName("Vocabulary file name")
			.setDesc(
				"Name of the file to store vocabulary words (without .md extension)",
			)
			.addText((cb) => {
				cb.setPlaceholder("Kobo Vocabulary")
					.setValue(this.plugin.settings.vocabularyFilePath)
					.onChange(async (value) => {
						this.plugin.settings.vocabularyFilePath = value;
						await this.plugin.saveSettings();
					});
			});
	}
}
