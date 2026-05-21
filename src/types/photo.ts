export type PhotoEntry = {
    id: string;
    file: File;
    objectUrl: string;
    thumbnailUrl: string;
    image: HTMLImageElement;
    width: number;
    height: number;
    name: string | null;
    type: string | null;
    size: number | null;
};
