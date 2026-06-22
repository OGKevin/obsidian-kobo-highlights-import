declare module "electron" {
	export const webUtils: {
		getPathForFile(_file: File): string;
	};
}
