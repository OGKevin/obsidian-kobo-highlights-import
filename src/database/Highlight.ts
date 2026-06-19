import { BookDetails, Bookmark, Content, Highlight, Word } from "./interfaces";
import { Repository } from "./repository";

type bookTitle = string;
export type chapter = string;

export class HighlightService {
	repo: Repository;
	unknownBookTitle = "Unknown Title";
	unknownAuthor = "Unknown Author";

	constructor(repo: Repository) {
		this.repo = repo;
	}

	getBookDetailsFromBookTitle(title: string): BookDetails {
		const details = this.repo.getBookDetailsByBookTitle(title);

		if (details == null) {
			return {
				title: this.unknownBookTitle,
				author: this.unknownAuthor,
			};
		}

		return details;
	}

	convertToMap(arr: Highlight[]): Map<bookTitle, Map<chapter, Bookmark[]>> {
		const m = new Map<string, Map<string, Bookmark[]>>();

		arr.forEach((x) => {
			const bookTitle =
				x.content.bookTitle || x.content.title || this.unknownBookTitle;

			const existingBook = m.get(bookTitle);
			if (existingBook) {
				const existingChapter = existingBook.get(x.content.title);

				if (existingChapter) {
					existingChapter.push(x.bookmark);
				} else {
					existingBook.set(x.content.title, [x.bookmark]);
				}
			} else {
				m.set(
					bookTitle,
					new Map<string, Bookmark[]>().set(x.content.title, [
						x.bookmark,
					]),
				);
			}
		});

		return m;
	}

	/**
	 * Returns all highlights sorted by book title, then by chapter order.
	 * Within each book, chapters are ordered by VolumeIndex — the EPUB spine
	 * index Kobo stores in the content table. This is the authoritative reading
	 * order and supersedes ContentID alphanumeric sort, which can mis-order
	 * books with non-sequential filenames (e.g. chapter9.xhtml > chapter10.xhtml).
	 * Null-safe: entries without VolumeIndex fall back to ContentID, preserving
	 * existing behaviour for books that lack spine data.
	 */
	getAllHighlight(sortByChapterProgress?: boolean): Highlight[] {
		const highlights: Highlight[] = [];

		const bookmarks = this.repo.getAllBookmark(sortByChapterProgress);
		for (const bookmark of bookmarks) {
			highlights.push(this.createHighlightFromBookmark(bookmark));
		}

		return highlights.sort((a, b) => {
			const aBookTitle =
				a.content.bookTitle || a.content.title || this.unknownBookTitle;
			const bBookTitle =
				b.content.bookTitle || b.content.title || this.unknownBookTitle;

			const bookCmp = aBookTitle.localeCompare(bBookTitle);
			if (bookCmp !== 0) return bookCmp;

			const aVol = a.content.volumeIndex;
			const bVol = b.content.volumeIndex;
			if (aVol != null && bVol != null) return aVol - bVol;
			if (aVol != null) return -1;
			if (bVol != null) return 1;
			return a.content.contentId.localeCompare(b.content.contentId);
		});
	}

	createHighlightFromBookmark(bookmark: Bookmark): Highlight {
		let content = this.repo.getContentByContentId(bookmark.contentId);

		if (content == null) {
			content = this.repo.getContentLikeContentId(
				bookmark.contentId,
			);
			if (content == null) {
				console.warn(
					`bookmark seems to link to a non existing content: ${bookmark.contentId}`,
				);
				return {
					bookmark: bookmark,
					content: {
						title: this.unknownBookTitle,
						contentId: bookmark.contentId,
						chapterIdBookmarked: "false",
						bookTitle: this.unknownBookTitle,
					},
				};
			}
		}

		if (content.chapterIdBookmarked == null) {
			return {
				bookmark: bookmark,
				content: this.findRightContentForBookmark(
					bookmark,
					content,
				),
			};
		}

		return {
			bookmark: bookmark,
			content: content,
		};
	}

	private findRightContentForBookmark(
		bookmark: Bookmark,
		originalContent: Content,
	): Content {
		const bookTitle =
			originalContent.bookTitle ||
			originalContent.title ||
			this.unknownBookTitle;

		if (!originalContent.bookTitle) {
			originalContent.bookTitle = bookTitle;
		}

		const contents =
			this.repo.getAllContentByBookTitleOrderedByContentId(
				bookTitle,
			);
		const potential =
			this.repo.getFirstContentLikeContentIdWithBookmarkIdNotNull(
				originalContent.contentId,
			);
		if (potential) {
			return potential;
		}

		let foundContent: Content | null = null;

		for (const c of contents) {
			if (c.chapterIdBookmarked) {
				foundContent = c;
			}

			if (c.contentId === bookmark.contentId && foundContent) {
				return foundContent;
			}
		}

		if (foundContent) {
			console.warn(
				`was not able to find chapterIdBookmarked for book ${originalContent.bookTitle}`,
			);
		}

		return originalContent;
	}

	getAllBooks(): Map<string, BookDetails> {
		const books = this.repo.getAllBookDetails();
		const bookMap = new Map<string, BookDetails>();

		for (const book of books) {
			bookMap.set(book.title, book);
		}

		return bookMap;
	}

	getAllContentByBookTitle(bookTitle: string): Content[] {
		return this.repo.getAllContentByBookTitle(bookTitle);
	}

	// Create an empty content map for books without highlights
	createEmptyContentMap(): Map<chapter, Bookmark[]> {
		return new Map<chapter, Bookmark[]>();
	}

	hasVocabulary(): boolean {
		return this.repo.hasWordListTable();
	}

	getAllWords(): Word[] {
		return this.repo.getAllWords();
	}
}
