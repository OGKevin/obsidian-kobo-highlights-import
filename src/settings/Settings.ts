import { App, PluginSettingTab, Setting } from "obsidian";
import KoboHighlightsImporter from "src/main";
import { HighlightSort } from "src/database/interfaces";
import { FileSuggestor } from "./suggestors/FileSuggestor";
import { FolderSuggestor } from "./suggestors/FolderSuggestor";

export const DEFAULT_SETTINGS: KoboHighlightsImporterSettings = {
	storageFolder: "",
	highlightSort: "date",
	templatePath: "",
	appendTemplatePath: "",
	importAllBooks: false,
	sqlitePath: "",
};

export interface KoboHighlightsImporterSettings {
	storageFolder: string;
	highlightSort: HighlightSort;
	templatePath: string;
	appendTemplatePath: string;
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
		this.add_highlight_sort();
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

	add_highlight_sort(): void {
		new Setting(this.containerEl)
			.setName("Sort highlights")
			.setDesc(
				"Date created: chronological order. " +
				"Reading order: chapters grouped by position in the book, highlights within each chapter by date. " +
				"Reading order (by position): same grouping, but highlights within a chapter sorted by their position in the spine item.",
			)
			.addDropdown((cb) => {
				cb.addOption("date", "Date created")
					.addOption("chapter", "Reading order")
					.addOption("position", "Reading order (by position)")
					.setValue(this.plugin.settings.highlightSort)
					.onChange(async (value) => {
						this.plugin.settings.highlightSort =
							value as HighlightSort;
						await this.plugin.saveSettings();
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
