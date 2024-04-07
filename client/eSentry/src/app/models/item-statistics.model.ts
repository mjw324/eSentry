export type PriceDistribution = {
    priceRange: string;
    count: number;
};

export type ItemStatistics = {
    averagePrice: string;
    minPrice: string;
    maxPrice: string;
    volumeLastMonth: string;
    volumeLastYear: string;
    priceDistribution: PriceDistribution[];
};
