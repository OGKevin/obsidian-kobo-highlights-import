import { FuzzySuggestModal, App } from "obsidian";
import { BookDetails } from "src/database/interfaces";

export class BookPickerModal extends FuzzySuggestModal<BookDetails> {
	private books: BookDetails[];
	private onChoose: (_book: BookDetails) => void;
	private initialQuery: string;

	constructor(
		app: App,
		books: BookDetails[],
		initialQuery: string,
		onChoose: (_book: BookDetails) => void,
	) {
		super(app);
		this.books = books;
		this.onChoose = onChoose;
		this.initialQuery = initialQuery;
		this.setPlaceholder("Search for your book...");
	}

	onOpen() {
		super.onOpen();
		this.inputEl.value = this.initialQuery;
		// Trigger the input event so the fuzzy search filters on the initial query
		this.inputEl.dispatchEvent(new Event("input"));
	}

	getItems(): BookDetails[] {
		return this.books;
	}

	getItemText(book: BookDetails): string {
		return `${book.title} — ${book.author}`;
	}

	onChooseItem(book: BookDetails): void {
		this.onChoose(book);
	}
}
