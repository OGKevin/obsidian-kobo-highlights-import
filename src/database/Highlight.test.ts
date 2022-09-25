import * as chai from 'chai';
import { readFileSync } from 'fs';
import SqlJs, { Database } from 'sql.js';
import { binary } from '../binaries/sql-wasm';
import { Repository } from '../database/repository';
import { HighlightService } from './Highlight';
import { Content } from './interfaces';

describe('HighlightService', async function () {
    let db: Database
    let repo: Repository
    let service: HighlightService

    before(async function () {
        const SQLEngine = await SqlJs({
            wasmBinary: binary
        })

        db = new SQLEngine.Database(readFileSync("KoboReader.sqlite"))
        repo = new Repository(db)
        service = new HighlightService(repo)
    })

    after(function () {
        db.close()
    })

    it('getAllHighlight', async function () {
        const all = await service.getAllHighlight()
        const total = await repo.getTotalBookmark()
        chai.expect(all).length(total)
    });

    it('fromMapToMarkdown with date', async function () {
        const bookmark = await repo.getBookmarkById("e7f8f92d-38ca-4556-bab8-a4d902e9c430")
        if (!bookmark) {
            chai.assert.isNotNull(bookmark)

            return
        }

        const highlight = await service.createHilightFromBookmark(bookmark)
        const map = service.convertToMap([highlight], true, "").get(highlight.content.bookTitle ?? "")

        if (!map) {
            chai.assert.isNotNull(map)

            return
        }

        const markdown = service.fromMapToMarkdown(highlight.content.bookTitle ?? "", map)
        chai.assert.deepEqual(
            markdown,
            `# Nemesis Games

## Chapter Eight: Holden

> “I guess I can’t be. How do you prove a negative?” — [[2022-08-05T20:46:41+00:00]]`
        )
    });

    it('fromMapToMarkdown without date', async function () {
        const bookmark = await repo.getBookmarkById("e7f8f92d-38ca-4556-bab8-a4d902e9c430")
        if (!bookmark) {
            chai.assert.isNotNull(bookmark)

            return
        }

        const highlight = await service.createHilightFromBookmark(bookmark)
        const map = service.convertToMap([highlight], false, "").get(highlight.content.bookTitle ?? "")

        if (!map) {
            chai.assert.isNotNull(map)

            return
        }

        const markdown = service.fromMapToMarkdown(highlight.content.bookTitle ?? "", map)
        chai.assert.deepEqual(
            markdown,
            `# Nemesis Games

## Chapter Eight: Holden

> “I guess I can’t be. How do you prove a negative?”`
        )
    });

    const bookmarkIds = new Map<string, Content>([
        [
            "e7f8f92d-38ca-4556-bab8-a4d902e9c430",
            {
                title: "Chapter Eight: Holden",
                contentId: "file:///mnt/onboard/Corey, James S.A_/Nemesis Games - James S.A. Corey.epub#(12)OEBPS/Text/ch09.html",
                bookTitle: "Nemesis Games",
                chapterIdBookmarked: undefined
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
    for (const [id, content] of bookmarkIds) {
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
        });
    }
});
