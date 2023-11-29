export type Monitor = {
    id: number;
    keywords: string;
    chatid: string;
    recentlink?: string;
    min_price?: number;
    max_price?: number;
    exclude_keywords?: string;
    condition_new?: boolean;
    condition_open_box?: boolean;
    condition_used?: boolean;
}