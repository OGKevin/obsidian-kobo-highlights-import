export interface Bookmark {
    bookmarkId: string,
    text: string;
    contentId: string;
    note?: string;
    dateCreated: Date
}

export interface Content {
    title: string;
    contentId: string;
    chapterIdBookmarked?: string;
    bookTitle?: string;
}

export interface Highlight {
    bookmark: Bookmark;
    content: Content;
}
