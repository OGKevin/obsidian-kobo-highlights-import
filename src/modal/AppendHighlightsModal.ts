import { webUtils } from "electron";
import { readFileSync } from "fs";
import { App, Modal, Notice, TFile } from "obsidian";
import SqlJs from "sql.js";
import { binary } from "src/binaries/sql-wasm";
import { HighlightService } from "src/database/Highlight";
import { BookDetails } from "src/database/interfaces";
import { Repository } from "src/database/repository";
import { KoboHighlightsImporterSettings } from "src/settings/Settings";
import {
	applyTemplateTransformations,
	defaultAppendTemplate,
} from "src/template/template";
import { getTemplateContents } from "src/template/templateContents";
import { BookPickerModal } from "./BookPickerModal";

export class AppendHighlightsModal extends Modal {
	goButtonEl!: HTMLButtonElement;
	inputFileEl!: HTMLInputElement;

	settings: KoboHighlightsImporterSettings;
	saveSettings: () => Promise<void>;
	activeFile: TFile;

	fileBuffer: ArrayBuffer | null | undefined;

	constructor(
		app: App,
		settings: KoboHighlightsImporterSettings,
		activeFile: TFile,
		saveSettings: () => Promise<void>,
	) {
		super(app);
		this.settings = settings;
		this.saveSettings = saveSettings;
		this.activeFile = activeFile;
	}

	private getFrontmatterValue(key: string): string | undefined {
		const cache = this.app.metadataCache.getFileCache(this.activeFile);
		const value = cache?.frontmatter?.[key];
		if (value && typeof value === "string" && value.trim()) {
			return value.trim();
		}
		return undefined;
	}

	private async appendHighlightsForBook(
		service: HighlightService,
		bookTitle: string,
	) {
		const highlights = await service.getHighlightsByBookTitle(
			bookTitle,
			this.settings.sortByChapterProgress,
		);

		if (highlights.length === 0) {
			new Notice(
				`No highlights found for "${bookTitle}" in the Kobo database`,
			);
			return;
		}

		const contentMap = service.convertToMap(highlights);
		const chapters = contentMap.get(bookTitle);

		if (!chapters) {
			new Notice(
				`No highlights found for "${bookTitle}" in the Kobo database`,
			);
			return;
		}

		const details = await service.getBookDetailsFromBookTitle(bookTitle);

		const template = await getTemplateContents(
			this.app,
			this.settings.appendTemplatePath,
			defaultAppendTemplate,
		);

		const rendered = applyTemplateTransformations(
			template,
			chapters,
			details,
		);

		const currentContent = await this.app.vault.read(this.activeFile);
		await this.app.vault.modify(
			this.activeFile,
			currentContent + "\n\n" + rendered,
		);

		new Notice(
			`Appended ${highlights.length} highlights from "${bookTitle}"`,
		);
	}

	private async fetchAndAppendHighlights() {
		if (!this.fileBuffer) {
			throw new Error("No sqlite DB file selected...");
		}

		const SQLEngine = await SqlJs({
			wasmBinary: binary.buffer,
		});

		const db = new SQLEngine.Database(new Uint8Array(this.fileBuffer));
		const service = new HighlightService(new Repository(db));

		// Try ISBN match first.
		const isbn = this.getFrontmatterValue("isbn");
		if (isbn) {
			const bookByIsbn = await service.getBookDetailsByIsbn(isbn);
			if (bookByIsbn) {
				await this.appendHighlightsForBook(service, bookByIsbn.title);
				return;
			}
		}

		// Fall back to book picker.
		const noteTitle =
			this.getFrontmatterValue("title") ?? this.activeFile.basename;
		const allBooks = await service.getAllBooks();
		const bookList = Array.from(allBooks.values());

		this.close();

		new BookPickerModal(
			this.app,
			bookList,
			noteTitle,
			async (selected: BookDetails) => {
				try {
					await this.appendHighlightsForBook(
						service,
						selected.title,
					);
				} catch (e) {
					console.error(e);
					new Notice(
						"Something went wrong... Check console for more details.",
					);
				}
			},
		).open();
	}

	private enableButton() {
		this.goButtonEl.disabled = false;
		this.goButtonEl.setAttr(
			"style",
			"background-color: green; color: black",
		);
	}

	private tryLoadStoredPath() {
		if (!this.settings.sqlitePath) return;

		try {
			const buf = readFileSync(this.settings.sqlitePath);
			this.fileBuffer = buf.buffer.slice(
				buf.byteOffset,
				buf.byteOffset + buf.byteLength,
			);
			this.enableButton();
			new Notice(`Loaded KoboReader.sqlite from remembered path`);
		} catch {
			new Notice(
				`Could not load sqlite file from remembered path — please select it manually`,
			);
		}
	}

	onOpen() {
		const { contentEl } = this;

		this.goButtonEl = contentEl.createEl("button");
		this.goButtonEl.textContent = "Append";
		this.goButtonEl.disabled = true;
		this.goButtonEl.setAttr("style", "background-color: red; color: white");
		this.goButtonEl.addEventListener("click", () => {
			new Notice("Extracting highlights...");
			this.fetchAndAppendHighlights()
				.then(() => {
					this.close();
				})
				.catch((e) => {
					console.error(e);
					new Notice(
						"Something went wrong... Check console for more details.",
					);
				});
		});

		this.inputFileEl = contentEl.createEl("input");
		this.inputFileEl.type = "file";
		this.inputFileEl.accept = ".sqlite";
		this.inputFileEl.addEventListener("change", (ev) => {
			const file = (ev.target as HTMLInputElement)?.files?.[0];
			if (!file) {
				console.error("No file selected");
				return;
			}

			// Save the path for future sessions using Electron's webUtils API.
			const filePath = webUtils.getPathForFile(file);
			if (filePath) {
				this.settings.sqlitePath = filePath;
				this.saveSettings();
			}

			const reader = new FileReader();
			reader.onload = () => {
				this.fileBuffer = reader.result as ArrayBuffer;
				this.enableButton();
				new Notice("Ready to extract!");
			};

			reader.onerror = (error) => {
				console.error("FileReader error:", error);
				new Notice("Error reading file");
			};

			reader.readAsArrayBuffer(file);
		});

		const heading = contentEl.createEl("h2");
		heading.textContent = "Append Kobo Highlights";

		const description = contentEl.createEl("p");
		description.innerHTML =
			"Please select your <em>KoboReader.sqlite</em> file from a connected device";

		contentEl.appendChild(heading);
		contentEl.appendChild(description);
		contentEl.appendChild(this.inputFileEl);
		contentEl.appendChild(this.goButtonEl);

		// Try to auto-load from the remembered path after the UI is shown.
		this.tryLoadStoredPath();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
