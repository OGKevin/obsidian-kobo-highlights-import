import * as chai from 'chai';
import { Repository } from '../database/repository';
import { HighlightService } from './Highlight';
import { Bookmark, Content, Highlight } from './interfaces';
import moment from 'moment';

describe('HighlightService', async function () {

    describe('Sample Content', async function () {
        
        let service: HighlightService

        before(async function () {
            const repo = <Repository> {}
            repo.getContentByContentId = () => Promise.resolve({
                title: "Chapter Eight: Holden",
                contentId: "file:///mnt/onboard/Corey, James S.A_/Nemesis Games - James S.A. Corey.epub#(12)OEBPS/Text/ch09.html",
                bookTitle: "Nemesis Games",
                chapterIdBookmarked: "true"
            })
            service = new HighlightService(repo)
        })

        describe('Sample Bookmark with no annotation', async function () {
            
            let highlight: Highlight
            let dateCreatedText: string

            before(async function () {
                const dateCreated = new Date(Date.UTC(2022, 7, 5, 20, 46, 41, 0))
                const bookmark: Bookmark = {
                    text: "“I guess I can’t be. How do you prove a negative?”",
                    contentId: "file:///mnt/onboard/Corey, James S.A_/Nemesis Games - James S.A. Corey.epub#(12)OEBPS/Text/ch09.html",
                    note: '',
                    dateCreated
                }
                highlight = await service.createHilightFromBookmark(bookmark)
                dateCreatedText = moment(dateCreated).format("")
            })

            it('fromMaptoMarkdown with date', async function () {
                const map = service
                    .convertToMap([highlight], true, "", false, '[!quote]', '[!note]')
                    .get(highlight.content.bookTitle ?? "")

                if(!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(highlight.content.bookTitle ?? "", map)
                chai.assert.deepEqual(
                    markdown, `# Nemesis Games

## Chapter Eight: Holden

> “I guess I can’t be. How do you prove a negative?” — [[` + dateCreatedText + `]]`
                )
            })

            it('fromMaptoMarkdown without date', async function () {
                const map = service
                    .convertToMap([highlight], false, "", false, '[!quote]', '[!note]')
                    .get(highlight.content.bookTitle ?? "")

                if(!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(highlight.content.bookTitle ?? "", map)
                chai.assert.deepEqual(
                    markdown, `# Nemesis Games

## Chapter Eight: Holden

> “I guess I can’t be. How do you prove a negative?”`
                )
            })

            it('fromMaptoMarkdown with callouts', async function () {
                const map = service
                    .convertToMap([highlight], false, "", true, 'quote', 'note')
                    .get(highlight.content.bookTitle ?? "")

                if(!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(highlight.content.bookTitle ?? "", map)
                chai.assert.deepEqual(
                    markdown, `# Nemesis Games

## Chapter Eight: Holden

> [!quote]
> “I guess I can’t be. How do you prove a negative?”`
                )
            })

            it('fromMaptoMarkdown with callouts and date', async function () {
                const map = service
                    .convertToMap([highlight], true, "", true, 'quote', 'note')
                    .get(highlight.content.bookTitle ?? "")

                if(!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(highlight.content.bookTitle ?? "", map)
                chai.assert.deepEqual(
                    markdown, `# Nemesis Games

## Chapter Eight: Holden

> [!quote]
> “I guess I can’t be. How do you prove a negative?” — [[` + dateCreatedText + `]]`
                )
            })
            
            it('fromMaptoMarkdown with custom callouts', async function () {
                const map = service
                    .convertToMap([highlight], false, "", true, 'bug', 'note')
                    .get(highlight.content.bookTitle ?? "")

                if(!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(highlight.content.bookTitle ?? "", map)
                chai.assert.deepEqual(
                    markdown, `# Nemesis Games

## Chapter Eight: Holden

> [!bug]
> “I guess I can’t be. How do you prove a negative?”`
                )
            })

            it('fromMaptoMarkdown with custom callouts and date', async function () {
                const map = service
                    .convertToMap([highlight], true, "", true, 'bug', 'note')
                    .get(highlight.content.bookTitle ?? "")

                if(!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(highlight.content.bookTitle ?? "", map)
                chai.assert.deepEqual(
                    markdown, `# Nemesis Games

## Chapter Eight: Holden

> [!bug]
> “I guess I can’t be. How do you prove a negative?” — [[` + dateCreatedText + `]]`
                )
            })
        })

        describe('Sample Bookmark with annotation', async function () {
            
            let highlight: Highlight
            let dateCreatedText: string

            before(async function () {
                const dateCreated = new Date(Date.UTC(2022, 7, 5, 20, 46, 41, 0))
                const bookmark: Bookmark = {
                    text: "“I guess I can’t be. How do you prove a negative?”",
                    contentId: "file:///mnt/onboard/Corey, James S.A_/Nemesis Games - James S.A. Corey.epub#(12)OEBPS/Text/ch09.html",
                    note: 'This is a great note!',
                    dateCreated
                }
                highlight = await service.createHilightFromBookmark(bookmark)
                dateCreatedText = moment(dateCreated).format("")
            })

            it('fromMaptoMarkdown with date', async function () {
                const map = service
                    .convertToMap([highlight], true, "", false, '[!quote]', '[!note]')
                    .get(highlight.content.bookTitle ?? "")

                if(!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(highlight.content.bookTitle ?? "", map)
                chai.assert.deepEqual(
                    markdown, `# Nemesis Games

## Chapter Eight: Holden

> “I guess I can’t be. How do you prove a negative?”

This is a great note! — [[` + dateCreatedText + `]]`
                )
            })

            it('fromMaptoMarkdown without date', async function () {
                const map = service
                    .convertToMap([highlight], false, "", false, '[!quote]', '[!note]')
                    .get(highlight.content.bookTitle ?? "")

                if(!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(highlight.content.bookTitle ?? "", map)
                chai.assert.deepEqual(
                    markdown, `# Nemesis Games

## Chapter Eight: Holden

> “I guess I can’t be. How do you prove a negative?”

This is a great note!`
                )
            })

            it('fromMaptoMarkdown with callouts', async function () {
                const map = service
                    .convertToMap([highlight], false, "", true, 'quote', 'note')
                    .get(highlight.content.bookTitle ?? "")

                if(!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(highlight.content.bookTitle ?? "", map)
                chai.assert.deepEqual(
                    markdown, `# Nemesis Games

## Chapter Eight: Holden

> [!quote]
> “I guess I can’t be. How do you prove a negative?”
>> [!note]
> This is a great note!`
                )
            })
            
            it('fromMaptoMarkdown with callouts and date', async function () {
                const map = service
                    .convertToMap([highlight], true, "", true, 'quote', 'note')
                    .get(highlight.content.bookTitle ?? "")

                if(!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(highlight.content.bookTitle ?? "", map)
                chai.assert.deepEqual(
                    markdown, `# Nemesis Games

## Chapter Eight: Holden

> [!quote]
> “I guess I can’t be. How do you prove a negative?”
>> [!note]
> This is a great note! — [[` + dateCreatedText + `]]`
                )
            })

            it('fromMaptoMarkdown with custom callouts', async function () {
                const map = service
                    .convertToMap([highlight], false, "", true, 'quote', 'bug')
                    .get(highlight.content.bookTitle ?? "")

                if(!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(highlight.content.bookTitle ?? "", map)
                chai.assert.deepEqual(
                    markdown, `# Nemesis Games

## Chapter Eight: Holden

> [!quote]
> “I guess I can’t be. How do you prove a negative?”
>> [!bug]
> This is a great note!`
                )
            })

            it('fromMaptoMarkdown with custom callouts and date', async function () {
                const map = service
                    .convertToMap([highlight], true, "", true, 'quote', 'bug')
                    .get(highlight.content.bookTitle ?? "")

                if(!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(highlight.content.bookTitle ?? "", map)
                chai.assert.deepEqual(
                    markdown, `# Nemesis Games

## Chapter Eight: Holden

> [!quote]
> “I guess I can’t be. How do you prove a negative?”
>> [!bug]
> This is a great note! — [[` + dateCreatedText + `]]`
                )
            })
        })
    })

    describe('with multiple content', async function() {

        const contentMap = new Map<string, Content>([
            [
                "e7f8f92d-38ca-4556-bab8-a4d902e9c430",
                {
                    title: "Chapter Eight: Holden",
                    contentId: "file:///mnt/onboard/Corey, James S.A_/Nemesis Games - James S.A. Corey.epub#(12)OEBPS/Text/ch09.html",
                    bookTitle: "Nemesis Games",
                    chapterIdBookmarked: "e7f8f92d-38ca-4556-bab8-a4d902e9c430!Text/chapter002.xhtml"
                }
            ],
            [
                "d40c9071-993f-4f1f-ae53-594847d9fd27",
                {
                    title: "On Passwords and Power Drills",
                    contentId: "/mnt/onboard/Adkins, Heather & Beyer, Betsy & Blankiotr & Oprea, Ana & Stubblefield, Adam/Building Secure and Reliable Systems_ Best PractiLewandowski & Ana Oprea & Adam Stubblefield.kepub.epub!!OEBPS/ch01.html#on_passwords_and_power_drills-2",
                    bookTitle: "Building Secure and Reliable Systems: Best Practices for Designing, Implementing, and Maintaining Systems",
                    chapterIdBookmarked: "/mnt/onboard/Adkins, Heather & Beyer, Betsy & Blankiotr & Oprea, Ana & Stubblefield, Adam/Building Secure and Reliable Systems_ Best PractiLewandowski & Ana Oprea & Adam Stubblefield.kepub.epub!!OEBPS/ch01.html"
                }
            ],
            [
                "3408844d-65a6-4d23-9d99-8f189ca07d0b",
                {
                    title: "Dune",
                    contentId: "23ba3dcf-3543-476c-984b-2f746c859763!OEBPS!Text/chapter001.xhtml-1",
                    bookTitle: "Dune",
                    chapterIdBookmarked: "23ba3dcf-3543-476c-984b-2f746c859763!OEBPS!Text/chapter001.xhtml"
                }
            ],
            [
                "c0d92aca-e4bb-476a-8131-ee0c0c21ced5",
                {
                    title: "11. Being On-Call",
                    contentId: "bce81485-5e92-4cca-8965-613c3ca12737!OEBPS!ch11.html#chapter_oncall-engineer-1",
                    bookTitle: "Site Reliability Engineering",
                    chapterIdBookmarked: "bce81485-5e92-4cca-8965-613c3ca12737!OEBPS!ch11.html"
                }
            ]
        ])

        const bookmarkMap = new Map<string, Bookmark>([
            [
                "e7f8f92d-38ca-4556-bab8-a4d902e9c430",
                <Bookmark> {
                    text: "“I guess I can’t be. How do you prove a negative?”",
                    contentId: "e7f8f92d-38ca-4556-bab8-a4d902e9c430",
                    note: '',
                    dateCreated: new Date('2022-08-05T20:46:41+00:00')
                }
            ],
            [
                "d40c9071-993f-4f1f-ae53-594847d9fd27",
                <Bookmark> {
                    text: "“I guess I can’t be. How do you prove a negative?”",
                    contentId: "d40c9071-993f-4f1f-ae53-594847d9fd27",
                    note: '',
                    dateCreated: new Date('2022-08-05T20:46:41+00:00')
                }
            ],
            [
                "3408844d-65a6-4d23-9d99-8f189ca07d0b",
                <Bookmark> {
                    text: "“I guess I can’t be. How do you prove a negative?”",
                    contentId: "3408844d-65a6-4d23-9d99-8f189ca07d0b",
                    note: '',
                    dateCreated: new Date('2022-08-05T20:46:41+00:00')
                }
            ],
            [
                "c0d92aca-e4bb-476a-8131-ee0c0c21ced5",
                <Bookmark> {
                    text: "“I guess I can’t be. How do you prove a negative?”",
                    contentId: "c0d92aca-e4bb-476a-8131-ee0c0c21ced5",
                    note: '',
                    dateCreated: new Date('2022-08-05T20:46:41+00:00')
                }
            ],
        ])

        let repo: Repository
		let service: HighlightService

        before(async function () {
            repo = <Repository> {}
            repo.getContentByContentId = (contentId) => Promise.resolve(contentMap.get(contentId) ?? null)
            repo.getTotalBookmark = () => Promise.resolve(contentMap.size);
            const bookmarks = new Array<Bookmark>()
            bookmarkMap.forEach(entry => bookmarks.push(entry))
            repo.getAllBookmark = () => Promise.resolve(bookmarks);
            repo.getBookmarkById = (bookmarkId) => Promise.resolve(bookmarkMap.get(bookmarkId) ?? null)
			service = new HighlightService(repo)
        })

        it('getAllHighlight', async function () {
            const all = await service.getAllHighlight()
            const total = await repo.getTotalBookmark()
            chai.expect(all).length(total)
        })

        for (const [id, content] of contentMap) {
            it(`createHilightFromBookmark ${id}`, async function () {
                const bookmark = await repo.getBookmarkById(id)
                if (!bookmark) {
                    chai.assert.isNotNull(bookmark)
                    return
                }

                const highlight = await service.createHilightFromBookmark(bookmark)
                chai.assert.deepEqual(highlight, {
                    content: content,
                    bookmark: bookmark
                })
            })
        }
    })
});
