declare module "electron" {
	export const webUtils: {
		getPathForFile(file: File): string;
	};
}
