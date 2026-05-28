import { App, Modal, normalizePath, Notice } from "obsidian";
import { sanitize } from "sanitize-filename-ts";
import SqlJs from "sql.js";
import { binary } from "src/binaries/sql-wasm";
import { HighlightService } from "src/database/Highlight";
import { Highlight } from "src/database/interfaces";
import { Repository } from "src/database/repository";
import { KoboHighlightsImporterSettings } from "src/settings/Settings";
import { applyTemplateTransformations } from "src/template/template";
import { getTemplateContents } from "src/template/templateContents";

export class ExtractHighlightsModal extends Modal {
	goButtonEl!: HTMLButtonElement;
	inputFileEl!: HTMLInputElement;

	settings: KoboHighlightsImporterSettings;

	fileBuffer: ArrayBuffer | null | undefined;

	nrOfBooksExtracted: number;

	constructor(app: App, settings: KoboHighlightsImporterSettings) {
		super(app);
		this.settings = settings;
		this.nrOfBooksExtracted = 0;
	}

	private async fetchHighlights() {
		if (!this.fileBuffer) {
			throw new Error("No sqlite DB file selected...");
		}

		const SQLEngine = await SqlJs({
			wasmBinary: binary.buffer,
		});

		const db = new SQLEngine.Database(new Uint8Array(this.fileBuffer));

		const service: HighlightService = new HighlightService(
			new Repository(db),
		);

		const allHighlights = await service.getAllHighlight(
			this.settings.sortByChapterProgress,
		);

		// Group highlights by book title.
		const highlightsByBook = new Map<string, Highlight[]>();
		for (const h of allHighlights) {
			const bookTitle = h.content.bookTitle ?? service.unknownBookTitle;
			if (!highlightsByBook.has(bookTitle))
				highlightsByBook.set(bookTitle, []);
			highlightsByBook.get(bookTitle)!.push(h);
		}

		// Include books with no highlights when the setting is enabled.
		if (this.settings.importAllBooks) {
			const allBooks = await service.getAllBooks();
			for (const [bookTitle] of allBooks) {
				if (!highlightsByBook.has(bookTitle))
					highlightsByBook.set(bookTitle, []);
			}
		}

		this.nrOfBooksExtracted = highlightsByBook.size;
		await this.writeBooks(service, highlightsByBook);
	}

	private async writeBooks(
		service: HighlightService,
		highlightsByBook: Map<string, Highlight[]>,
	) {
		const template = await getTemplateContents(
			this.app,
			this.settings.templatePath,
		);

		for (const [bookTitle, bookHighlights] of highlightsByBook) {
			const sanitizedBookName = sanitize(bookTitle);
			const fileName = normalizePath(
				`${this.settings.storageFolder}/${sanitizedBookName}.md`,
			);

			const [chapters, details] = await Promise.all([
				Promise.resolve(
					service.buildChapterList(bookHighlights),
				),
				service.getBookDetailsFromBookTitle(bookTitle),
			]);

			await this.app.vault.adapter.write(
				fileName,
				applyTemplateTransformations(template, chapters, details),
			);
		}
	}

	onOpen() {
		const { contentEl } = this;

		this.goButtonEl = contentEl.createEl("button");
		this.goButtonEl.textContent = "Extract";
		this.goButtonEl.disabled = true;
		this.goButtonEl.setAttr("style", "background-color: red; color: white");
		this.goButtonEl.addEventListener("click", () => {
			new Notice("Extracting highlights...");
			this.fetchHighlights()
				.then(() => {
					new Notice(
						"Extracted highlights from " +
							this.nrOfBooksExtracted +
							" books!",
					);
					this.close();
				})
				.catch((e) => {
					console.log(e);
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

			// Convert File to ArrayBuffer
			const reader = new FileReader();
			reader.onload = () => {
				this.fileBuffer = reader.result as ArrayBuffer; // Store the ArrayBuffer
				this.goButtonEl.disabled = false;
				this.goButtonEl.setAttr(
					"style",
					"background-color: green; color: black",
				);
				new Notice("Ready to extract!");
			};

			reader.onerror = (error) => {
				console.error("FileReader error:", error);
				new Notice("Error reading file");
			};

			reader.readAsArrayBuffer(file);
		});

		const heading = contentEl.createEl("h2");
		heading.textContent = "Sqlite file location";

		const description = contentEl.createEl("p");
		description.innerHTML =
			"Please select your <em>KoboReader.sqlite</em> file from a connected device";

		contentEl.appendChild(heading);
		contentEl.appendChild(description);
		contentEl.appendChild(this.inputFileEl);
		contentEl.appendChild(this.goButtonEl);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
