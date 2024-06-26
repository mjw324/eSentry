export type Monitor = {
    id: number;
    keywords?: string;
    seller?: string;
    chatid?: string;
    email?: string;
    active: number;
    recentlink?: string;
    min_price?: number;
    max_price?: number;
    exclude_keywords?: string;
    condition_new?: boolean;
    condition_open_box?: boolean;
    condition_used?: boolean;
    userid?: string;
}