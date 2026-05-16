import { BookDetails, Bookmark, Content, Highlight } from "./interfaces";
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

	async getBookDetailsFromBookTitle(title: string): Promise<BookDetails> {
		const details = await this.repo.getBookDetailsByBookTitle(title);

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
			if (!x.content.bookTitle) {
				throw new Error("bookTitle must be set");
			}

			const existingBook = m.get(x.content.bookTitle);
			if (existingBook) {
				const existingChapter = existingBook.get(x.content.title);

				if (existingChapter) {
					existingChapter.push(x.bookmark);
				} else {
					existingBook.set(x.content.title, [x.bookmark]);
				}
			} else {
				m.set(
					x.content.bookTitle,
					new Map<string, Bookmark[]>().set(x.content.title, [
						x.bookmark,
					]),
				);
			}
		});

		return m;
	}

	async getAllHighlight(
		sortByChapterProgress?: boolean,
		importArticles?: boolean,
	): Promise<Highlight[]> {
		const highlights: Highlight[] = [];

		const bookmarks = await this.repo.getAllBookmark(sortByChapterProgress, importArticles);
		for (const bookmark of bookmarks) {
			highlights.push(await this.createHighlightFromBookmark(bookmark));
		}

		return highlights.sort(function (a, b): number {
			if (!a.content.bookTitle || !b.content.bookTitle) {
				throw new Error("bookTitle must be set");
			}

			return (
				a.content.bookTitle.localeCompare(b.content.bookTitle) ||
				a.content.contentId.localeCompare(b.content.contentId)
			);
		});
	}

	async createHighlightFromBookmark(bookmark: Bookmark): Promise<Highlight> {
		let content = await this.repo.getContentByContentId(bookmark.contentId);

		if (content == null) {
			content = await this.repo.getContentLikeContentId(
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
				content: await this.findRightContentForBookmark(
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

	private async findRightContentForBookmark(
		bookmark: Bookmark,
		originalContent: Content,
	): Promise<Content> {
		if (!originalContent.bookTitle) {
			throw new Error("bookTitle field must be set");
		}

		const contents =
			await this.repo.getAllContentByBookTitleOrderedByContentId(
				originalContent.bookTitle,
			);
		const potential =
			await this.repo.getFirstContentLikeContentIdWithBookmarkIdNotNull(
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

	async getAllBooks(importArticles?: boolean): Promise<Map<string, BookDetails>> {
		const books = await this.repo.getAllBookDetails(importArticles);
		const bookMap = new Map<string, BookDetails>();

		for (const book of books) {
			bookMap.set(book.title, book);
		}

		return bookMap;
	}

	async getAllContentByBookTitle(bookTitle: string): Promise<Content[]> {
		return this.repo.getAllContentByBookTitle(bookTitle);
	}

	// Create an empty content map for books without highlights
	createEmptyContentMap(): Map<chapter, Bookmark[]> {
		return new Map<chapter, Bookmark[]>();
	}
}
