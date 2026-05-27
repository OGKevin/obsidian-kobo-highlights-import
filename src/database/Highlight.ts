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

	async getBookDetailsByIsbn(isbn: string): Promise<BookDetails | null> {
		return this.repo.getBookDetailsByIsbn(isbn);
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
	): Promise<Highlight[]> {
		const highlights: Highlight[] = [];

		const bookmarks = await this.repo.getAllBookmark(sortByChapterProgress);
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

	async getAllBooks(): Promise<Map<string, BookDetails>> {
		const books = await this.repo.getAllBookDetails();
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

	// Efficiently fetches highlights for a single book.
	//
	// The naive approach (getAllHighlight + filter) fetches every bookmark in the
	// database and issues 1-4 DB queries per bookmark to resolve its content,
	// then discards all results except the target book. For a device with many
	// books this is extremely wasteful.
	//
	// Instead we:
	//   1. Fetch only this book's bookmarks via a filtered SQL query (1 DB call).
	//   2. Fetch all content entries for the book ordered by ContentID (1 DB call).
	//   3. Resolve content associations entirely in-memory — O(M) per bookmark
	//      where M is the number of chapters, rather than issuing further DB calls.
	async getHighlightsByBookTitle(
		bookTitle: string,
		sortByChapterProgress?: boolean,
	): Promise<Highlight[]> {
		const [bookmarks, allContents] = await Promise.all([
			this.repo.getBookmarksByBookTitle(bookTitle, sortByChapterProgress),
			this.repo.getAllContentByBookTitleOrderedByContentId(bookTitle),
		]);

		// Build an exact-match index for O(1) lookups.
		const contentById = new Map<string, Content>(
			allContents.map((c) => [c.contentId, c]),
		);

		const highlights: Highlight[] = [];
		for (const bookmark of bookmarks) {
			highlights.push(
				this.resolveHighlightInMemory(
					bookmark,
					bookTitle,
					contentById,
					allContents,
				),
			);
		}

		return highlights;
	}

	// In-memory equivalent of createHighlightFromBookmark + findRightContentForBookmark,
	// using pre-fetched content data to avoid per-bookmark DB queries.
	private resolveHighlightInMemory(
		bookmark: Bookmark,
		bookTitle: string,
		contentById: Map<string, Content>,
		allContents: Content[], // ordered by ContentID
	): Highlight {
		// 1. Exact match.
		let content = contentById.get(bookmark.contentId) ?? null;

		// 2. Fuzzy match: find a content entry whose ContentID contains the bookmark's ContentID.
		if (!content) {
			content =
				allContents.find((c) =>
					c.contentId.includes(bookmark.contentId),
				) ?? null;
		}

		if (!content) {
			console.warn(
				`bookmark seems to link to a non existing content: ${bookmark.contentId}`,
			);
			return {
				bookmark,
				content: {
					title: this.unknownBookTitle,
					contentId: bookmark.contentId,
					chapterIdBookmarked: "false",
					bookTitle: this.unknownBookTitle,
				},
			};
		}

		// 3. If chapterIdBookmarked is null, walk the sorted content list to find
		//    the right chapter — mirrors findRightContentForBookmark logic.
		if (content.chapterIdBookmarked == null) {
			content = this.findRightContentInMemory(
				bookmark,
				content,
				allContents,
			);
		}

		return { bookmark, content };
	}

	// In-memory equivalent of findRightContentForBookmark.
	private findRightContentInMemory(
		bookmark: Bookmark,
		originalContent: Content,
		allContents: Content[], // ordered by ContentID
	): Content {
		// Mirror getFirstContentLikeContentIdWithBookmarkIdNotNull:
		// find a content whose ContentID starts with originalContent's ContentID
		// and has chapterIdBookmarked set.
		const potential = allContents.find(
			(c) =>
				c.contentId.startsWith(originalContent.contentId) &&
				c.chapterIdBookmarked != null,
		);
		if (potential) return potential;

		// Fall back to sequential scan (mirrors the for-loop in findRightContentForBookmark).
		let foundContent: Content | null = null;
		for (const c of allContents) {
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

	// Groups highlights for a single book into a chapter map.
	//
	// When the same chapter title appears under different content entries
	// (e.g. "Chapter 1" in Part One and "Chapter 1" in Part Two of 1984),
	// each distinct contentId gets its own map key. The second occurrence is
	// named "Chapter 1 (2)", the third "Chapter 1 (3)", so highlights are
	// never silently merged.
	buildChapterMapWithDedup(highlights: Highlight[]): Map<chapter, Bookmark[]> {
		const chapterMap = new Map<chapter, Bookmark[]>();
		const contentIdToKey = new Map<string, string>();
		const titleCount = new Map<string, number>();

		for (const h of highlights) {
			const { title, contentId } = h.content;
			let key = contentIdToKey.get(contentId);

			if (key === undefined) {
				const count = (titleCount.get(title) ?? 0) + 1;
				titleCount.set(title, count);
				key = count === 1 ? title : `${title} (${count})`;
				contentIdToKey.set(contentId, key);
				chapterMap.set(key, []);
			}

			chapterMap.get(key)!.push(h.bookmark);
		}

		return chapterMap;
	}
}
