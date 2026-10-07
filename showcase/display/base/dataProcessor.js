/**
 * Shared data processing functions
 * Handles data filtering, aggregation, and calculations
 */
export class DataProcessor {
    constructor() {
        this.sampledScenarios = [];
        this.originalData = {};
    }

    /**
     * Get the two-tailed 95% t critical value for a sample size.
     * Falls back to the normal approximation for larger samples.
     */
    static getTValue95(sampleSize) {
        const tValuesByDf = {
            1: 12.706,
            2: 4.303,
            3: 3.182,
            4: 2.776,
            5: 2.571,
            6: 2.447,
            7: 2.365,
            8: 2.306,
            9: 2.262,
            10: 2.228,
            11: 2.201,
            12: 2.179,
            13: 2.160,
            14: 2.145,
            15: 2.131,
            16: 2.120,
            17: 2.110,
            18: 2.101,
            19: 2.093,
            20: 2.086,
            21: 2.080,
            22: 2.074,
            23: 2.069,
            24: 2.064,
            25: 2.060,
            26: 2.056,
            27: 2.052,
            28: 2.048,
            29: 2.045,
            30: 2.042
        };

        if (sampleSize <= 1) {
            return 0;
        }

        const degreesOfFreedom = sampleSize - 1;
        return tValuesByDf[degreesOfFreedom] || 1.96;
    }

    /**
     * Calculate a 95% confidence interval for the mean at one timestamp.
     */
    static calculateMeanConfidenceBounds(prices) {
        const sampleSize = prices.length;
        const meanPrice = prices.reduce((sum, price) => sum + price, 0) / sampleSize;

        if (sampleSize <= 1) {
            return {
                mean: meanPrice,
                lower: meanPrice,
                upper: meanPrice,
                marginOfError: 0,
                sampleSize
            };
        }

        const variance = prices.reduce((sum, price) => {
            return sum + ((price - meanPrice) ** 2);
        }, 0) / (sampleSize - 1);
        const standardDeviation = Math.sqrt(variance);
        const standardError = standardDeviation / Math.sqrt(sampleSize);
        const marginOfError = DataProcessor.getTValue95(sampleSize) * standardError;

        return {
            mean: meanPrice,
            lower: meanPrice - marginOfError,
            upper: meanPrice + marginOfError,
            marginOfError,
            sampleSize
        };
    }

    /**
     * Get fixed scenarios for consistent experiment conditions
     * Uses scenarios [1, 2, 3, 4, 5] for a fixed 5-line-per-series view
     */
    static getFixedScenarios() {
        return ['scenario_1', 'scenario_2', 'scenario_3', 'scenario_4', 'scenario_5'];
    }

    /**
     * Process raw data into filtered datasets for each stock
     */
    processData(rawData, currentStartDate = '05/01') {
        // Validate input data
        if (!rawData) {
            throw new Error('DataProcessor: rawData is null or undefined');
        }
        
        if (!Array.isArray(rawData)) {
            // Handle case where data might be wrapped in an object
            if (typeof rawData === 'object' && rawData.data && Array.isArray(rawData.data)) {
                console.warn('DataProcessor: Found wrapped data format, unwrapping...');
                rawData = rawData.data;
            } else {
                throw new Error(`DataProcessor: Expected rawData to be an array, got ${typeof rawData}. If data is wrapped, ensure it has a 'data' property with an array.`);
            }
        }
        
        if (rawData.length === 0) {
            throw new Error('DataProcessor: rawData array is empty');
        }
        
        // Validate data structure 
        const firstItem = rawData[0];

        // Store original data
        const stockA = rawData.filter(d => d.stock === 'A');
        const stockB = rawData.filter(d => d.stock === 'B');
        this.originalData.A = stockA;
        this.originalData.B = stockB;

        // Get all available scenarios from prediction data (only once)
        if (this.sampledScenarios.length === 0) {
            const allScenarios = [...new Set(rawData
                .filter(d => d.series === 'prediction' && d.scenario)
                .map(d => d.scenario)
            )];
            
            // Use fixed scenarios for consistency: [1, 2, 3, 4, 5]
            const fixedScenarios = DataProcessor.getFixedScenarios();
            
            // Only include scenarios that exist in the data
            this.sampledScenarios = fixedScenarios.filter(scenario => allScenarios.includes(scenario));
            
        }

        // Process each stock with current date filter
        const stockData = {
            A: this.processStockData(stockA, currentStartDate),
            B: this.processStockData(stockB, currentStartDate)
        };

        return this.createProcessedData(stockData);
    }

    /**
     * Build the processed data object with live-derived prediction statistics.
     */
    createProcessedData(stockData) {
        return {
            stockData,
            get realTimeAggregated() {
                return DataProcessor.calculateRealTimeAggregation(stockData);
            },
            get confidenceBounds() {
                return DataProcessor.calculateConfidenceBounds(stockData);
            },
            globalYScale: this.calculateGlobalYScale(stockData),
            sampledScenarios: this.sampledScenarios
        };
    }

    /**
     * Process individual stock data with date filtering
     */
    processStockData(stockData, currentStartDate) {
        // Filter historical data based on start date
        const startYear = 2025;
        const [startMonth, startDay] = currentStartDate.split('/').map(Number);
        const filterDate = new Date(startYear, startMonth - 1, startDay);
        
        const historical = stockData
            .filter(d => d.series === 'historical')
            .map(d => ({ date: new Date(d.date), price: d.price }))
            .filter(d => d.date >= filterDate)
            .sort((a, b) => a.date - b.date);

        // Filter alternatives to only include sampled scenarios
        const alternatives = stockData
            .filter(d => d.series === 'prediction' && 
                       d.scenario && 
                       this.sampledScenarios.includes(d.scenario))
            .map(d => ({ scenario: d.scenario, date: new Date(d.date), price: d.price }))
            .sort((a, b) => a.date - b.date);

        return {
            historical,
            alternatives
        };
    }

    /**
     * Calculate real-time aggregation from sampled scenarios
     */
    static getAlternativesGroupedByDate(alternatives) {
        const groupedByDate = {};

        alternatives.forEach(item => {
            const dateKey = item.date.toISOString();
            if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = [];
            }
            groupedByDate[dateKey].push(item.price);
        });

        return groupedByDate;
    }

    /**
     * Calculate real-time aggregation directly from scenario alternatives.
     */
    static calculateRealTimeAggregation(stockData) {
        const realTimeAggregated = {};
        
        ['A', 'B'].forEach(stock => {
            const groupedByDate = DataProcessor.getAlternativesGroupedByDate(
                stockData[stock].alternatives
            );
            
            // Calculate mean for each date
            const aggregatedData = [];
            Object.keys(groupedByDate).sort().forEach(date => {
                const prices = groupedByDate[date];
                const meanPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
                aggregatedData.push({
                    date: new Date(date),
                    price: meanPrice
                });
            });
            
            realTimeAggregated[stock] = aggregatedData;
        });

        return realTimeAggregated;
    }

    /**
     * Calculate confidence bounds from sampled scenarios
     */
    static calculateConfidenceBounds(stockData) {
        const confidenceBounds = {};
        
        ['A', 'B'].forEach(stock => {
            const groupedByDate = DataProcessor.getAlternativesGroupedByDate(
                stockData[stock].alternatives
            );
            
            // Calculate 95% confidence bounds for the mean at each date
            const boundsData = [];
            Object.keys(groupedByDate).sort().forEach(date => {
                const prices = groupedByDate[date];
                const {
                    mean,
                    lower,
                    upper,
                    marginOfError,
                    sampleSize
                } = DataProcessor.calculateMeanConfidenceBounds(prices);
                
                boundsData.push({
                    date: new Date(date),
                    lower,
                    upper,
                    mean,
                    marginOfError,
                    sampleSize
                });
            });
            
            confidenceBounds[stock] = boundsData;
        });
        
        return confidenceBounds;
    }

    /**
     * Calculate global Y scale domain
     */
    calculateGlobalYScale(stockData) {
        // Fixed y-axis range for consistent visualization across all phases
        return [0, 100]; // Humidity range from 0 to 100
    }

    /**
     * Get sampled scenarios
     */
    getSampledScenarios() {
        return this.sampledScenarios;
    }

    /**
     * Get original data
     */
    getOriginalData() {
        return this.originalData;
    }

    /**
     * Reprocess data with new start date
     */
    reprocessWithNewDate(currentStartDate) {
        if (!this.originalData.A || !this.originalData.B) {
            throw new Error('Original data not available for reprocessing');
        }

        // Reprocess the data with the new date
        const stockData = {
            A: this.processStockData(this.originalData.A, currentStartDate),
            B: this.processStockData(this.originalData.B, currentStartDate)
        };

        return this.createProcessedData(stockData);
    }
}
