// source: https://github.com/liamcain/obsidian-periodic-notes/blob/04965a1e03932d804f6dd42c2e5dba0ede010d79/src/ui/file-suggest.ts

import { TAbstractFile, TFile } from "obsidian";
import { TextInputSuggest } from "./Suggest";

export class FileSuggestor extends TextInputSuggest<TFile> {
    getSuggestions(inputStr: string): TFile[] {
        const abstractFiles = this.app.vault.getAllLoadedFiles();
        const files: TFile[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        abstractFiles.forEach((file: TAbstractFile) => {
            if (
                file instanceof TFile &&
                file.extension === "md" &&
                file.path.toLowerCase().contains(lowerCaseInputStr)
            ) {
                files.push(file);
            }
        });

        return files;
    }

    renderSuggestion(file: TFile, el: HTMLElement): void {
        el.setText(file.path);
    }

    selectSuggestion(file: TFile): void {
        this.inputEl.value = file.path;
        this.inputEl.trigger("input");
        this.close();
    }
}
