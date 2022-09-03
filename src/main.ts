import { addIcon, Plugin } from 'obsidian';
import { ExtractHighlightsModal } from './modal/ExtractHighlightsModal';
import { DEFAULT_SETTINGS, KoboHighlightsImporterSettings, KoboHighlightsImporterSettingsTab } from './settings/Settings';

const EREADER_ICON_PATH = `<path stroke="currentColor" fill="currentColor" d="M 68.15625 55.882812 C 67.609375 54.335938 66.207031 53.367188 64.566406 53.367188 L 62.085938 53.367188 L 62.085938 8.894531 C 62.085938 4.367188 58.457031 0.773438 53.886719 0.773438 L 9.761719 0.773438 C 4.910156 0.773438 0.78125 4.859375 0.78125 9.667969 L 0.78125 80.4375 C 0.78125 85.039062 5.058594 88.945312 9.664062 88.945312 L 54.261719 88.945312 C 54.734375 88.945312 55.148438 89.324219 55.113281 89.792969 C 55.074219 90.28125 54.664062 90.492188 54.179688 90.492188 L 36.410156 90.492188 L 49.980469 98.226562 L 81.21875 98.226562 Z M 32.039062 85.15625 C 30.789062 85.15625 29.851562 84.226562 29.851562 82.992188 C 29.851562 81.8125 30.851562 80.824219 32.039062 80.824219 C 33.289062 80.824219 34.226562 81.753906 34.226562 82.988281 C 34.1875 84.226562 33.289062 85.15625 32.039062 85.15625 Z M 56.230469 53.367188 L 48.554688 53.367188 C 46.484375 53.367188 44.730469 55.183594 44.730469 57.234375 C 44.730469 59.285156 46.484375 61.101562 48.554688 61.101562 L 56.289062 61.101562 L 56.289062 77.34375 L 7.027344 77.34375 L 7.027344 11.988281 L 56.230469 11.988281 Z M 45.257812 15.898438 L 45.257812 43.113281 C 43.390625 43.113281 41.882812 44.605469 41.882812 46.453125 C 41.882812 48.300781 43.390625 49.796875 45.257812 49.796875 L 45.257812 51.09375 L 21.042969 51.09375 L 21.042969 51.078125 C 18.550781 50.980469 16.542969 48.949219 16.542969 46.453125 C 16.542969 46.242188 16.601562 20.539062 16.601562 20.539062 C 16.601562 17.988281 18.707031 15.902344 21.285156 15.902344 L 45.257812 15.902344 Z M 42.066406 43.082031 L 20.957031 43.125 C 19.21875 43.253906 17.839844 44.691406 17.839844 46.4375 C 17.839844 48.285156 19.363281 49.792969 21.226562 49.78125 L 42.027344 49.78125 C 41.144531 48.933594 40.574219 47.75 40.574219 46.4375 C 40.574219 45.113281 41.15625 43.929688 42.066406 43.082031 Z M 42.066406 43.082031 "/>`

export default class KoboHighlightsImporter extends Plugin {
	settings!: KoboHighlightsImporterSettings;

	async onload() {
		addIcon('e-reader', EREADER_ICON_PATH)
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const KoboHighlightsImporterIconEl = this.addRibbonIcon('e-reader', 'Import from Kobo', () => {
			// Called when the user clicks the icon.
			new ExtractHighlightsModal(this.app, this.settings).open();

		});
		// Perform additional things with the ribbon
		KoboHighlightsImporterIconEl.addClass('kobo-highlights-importer-icon');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'import-from-kobo-sqlite',
			name: 'Import from Kobo',
			callback: () => {
				new ExtractHighlightsModal(this.app, this.settings).open();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new KoboHighlightsImporterSettingsTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


		if (includeCreatedDate) {
			const createdDate = new Date(e[4]);
			const formattedDate = "[[" + (moment(createdDate)).format(dateFormat) + "]]";
			entry = entry + " - " + formattedDate;
		}

		if (old[e[1]]) {
			if (old[e[1]][e[2]]) {
				old[e[1]][e[2]].push(entry)
			} else {
				old[e[1]][e[2]] = [entry]
			}
		}
		else {
			old[e[1]] = {
				[e[2]]: [entry]
			}
		}
		return old
	}, {})
}