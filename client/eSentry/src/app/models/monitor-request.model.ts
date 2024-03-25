export type MonitorRequest = {
    keywords: string;
    chatid?: string | null;
    email?: string | null;
    active: boolean;
    min_price?: number | null;
    max_price?: number | null;
    exclude_keywords?: string | null;
    condition_new?: boolean;
    condition_open_box?: boolean;
    condition_used?: boolean;
    id?: number;
}