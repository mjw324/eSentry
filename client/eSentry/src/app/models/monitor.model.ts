export type Monitor = {
    id: number;
    keywords: string;
    chatID: string;
    recentlink?: string;
    minprice?: number;
    maxprice?: number;
    excludekeywords?: string;
    conditionnew?: boolean;
    conditionopenbox?: boolean;
    conditionused?: boolean;
}
