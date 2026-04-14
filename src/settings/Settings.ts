import { App, PluginSettingTab, Setting } from "obsidian";
import KoboHighlightsImporter from "src/main";
import { FileSuggestor } from "./suggestors/FileSuggestor";
import { FolderSuggestor } from "./suggestors/FolderSuggestor";

export const DEFAULT_SETTINGS: KoboHighlightsImporterSettings = {
	storageFolder: "",
	sortByChapterProgress: false,
	templatePath: "",
	appendTemplatePath: "",
	sortByChapterOrder: true,
	importAllBooks: false,
	sqlitePath: "",
};

export interface KoboHighlightsImporterSettings {
	storageFolder: string;
	sortByChapterProgress: boolean;
	templatePath: string;
	appendTemplatePath: string;
	sortByChapterOrder: boolean;
	importAllBooks: boolean;
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
		this.add_append_template_path();
		this.add_append_sort_by_chapter_order();
		this.add_sort_by_chapter_progress();
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
					.onChange((newTemplatePath) => {
						this.plugin.settings.templatePath = newTemplatePath;
						this.plugin.saveSettings();
					});
			});
	}

	add_append_template_path(): void {
		new Setting(this.containerEl)
			.setName("Append Template Path")
			.setDesc(
				"Template used when appending highlights to an existing note",
			)
			.addSearch((cb) => {
				new FileSuggestor(this.app, cb.inputEl);
				cb.setPlaceholder("Example: folder1/append-template")
					.setValue(this.plugin.settings.appendTemplatePath)
					.onChange((newTemplatePath) => {
						this.plugin.settings.appendTemplatePath =
							newTemplatePath;
						this.plugin.saveSettings();
					});
			});
	}

	add_append_sort_by_chapter_order(): void {
		const desc = document.createDocumentFragment();
		desc.append(
			"Sort chapters in reading order (by their position in the book). ",
			"When disabled, chapters appear in the order you first highlighted in each one.",
		);

		new Setting(this.containerEl)
			.setName("Sort chapters in reading order")
			.setDesc(desc)
			.addToggle((cb) => {
				cb.setValue(
					this.plugin.settings.sortByChapterOrder,
				).onChange(async (toggle) => {
					this.plugin.settings.sortByChapterOrder = toggle;
					await this.plugin.saveSettings();
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
