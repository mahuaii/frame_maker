export type TextItemType = 'group' | 'text' | 'separator' | 'image';

export type TextStyle = {
    useOwnFont?: boolean;
    fontOverride?: boolean;
    fontId?: string;
    fontIdEn?: string;
    fontIdZh?: string;
    fontScale?: number;
    fontWeight?: number;
    fontStyle?: string;
    colorToken?: string;
    color?: string;
    letterSpacingScale?: number;
    lineHeightScale?: number;
};

export type TextImageSource = {
    type?: string;
    src?: string;
    name?: string;
    crossOrigin?: string;
};

export type TextObjectBase = {
    id: string;
    type: TextItemType;
    label?: string;
    visible?: boolean;
    style?: TextStyle;
};

export type TextGroup = TextObjectBase & {
    type: 'group';
    items: TextObject[];
    region?: string;
    anchor?: string;
    direction?: string;
    rotation?: number;
    align?: string;
    gapScale?: number;
    offsetXScale?: number;
    offsetYScale?: number;
};

export type TextItem = TextObjectBase & {
    type: 'text';
    content?: string;
};

export type TextSeparator = TextObjectBase & {
    type: 'separator';
    forceVisible?: boolean;
    lengthScale?: number;
    thicknessScale?: number;
    colorToken?: string;
    color?: string;
};

export type TextImage = TextObjectBase & {
    type: 'image';
    source?: TextImageSource | null;
};

export type TextObject = TextGroup | TextItem | TextSeparator | TextImage;

export type TextModel = TextGroup[];

export type TextObjectLocation = {
    item: TextObject;
    parent: TextGroup | null;
    index: number;
    depth: number;
    siblings: TextObject[];
};

export type TextObjectDropPosition = 'before' | 'after' | 'inside';

export type TextColorPaletteItem = {
    id: string;
    value: string;
};

