export type MonitorRequest = {
    userid: string;
    keywords: string;
    chatid: string;
    min_price?: number;
    max_price?: number;
    exclude_keywords?: string;
    condition_new?: boolean;
    condition_open_box?: boolean;
    condition_used?: boolean;
}