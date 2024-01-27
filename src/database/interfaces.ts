/* eslint-disable no-unused-vars */
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

export interface BookDetails {
    title: string;
    author: string;
    description?: string;
    publisher?: string;
    dateLastRead?: Date;
    readStatus?: ReadStatus;
    percentRead?: number;
    isbn?: string;
    series?: string;
    seriesNumber?: number;
    timeSpentReading?: number;
}

export enum ReadStatus {
    Unknown = -1,
    Unopened = 0,
    Reading = 1,
    Read = 2
}