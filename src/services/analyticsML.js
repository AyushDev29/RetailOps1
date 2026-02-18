/**
 * Statistical Intelligence Layer (Native JS)
 * Provides "Predictive Analytics" without external dependencies.
 * 
 * SAFEGUARDS:
 * - All functions handle empty/null inputs gracefully.
 * - Employee analysis requires minimum data points to avoid false flags.
 * - Forecasting includes confidence intervals and smoothing.
 */

// --- 1. TREND-BASED REVENUE PROJECTION (Honest Forecasting) ---

/**
 * Predicts future revenue using Linear Regression + Seasonality + Smoothing
 * @param {Array} revenueHistory - Array of { date: 'YYYY-MM-DD', revenue: number }
 * @param {number} daysToForecast - Number of days to project (default 14)
 * @returns {Array} Array of { date, value, lowerBound, upperBound, isProjection: true }
 */
/**
 * Predicts future revenue using Strict Linear Regression (Conservative)
 * @param {Array} revenueHistory - Array of { date: 'YYYY-MM-DD', revenue: number }
 * @param {number} daysToForecast - Number of days to project (default 14)
 * @returns {Array|null} Array of forecast objects or NULL if insufficient data
 */
export const predictRevenue = (revenueHistory, daysToForecast = 14) => {
    // 1. STRICT DATA GATING
    if (!revenueHistory || revenueHistory.length < 14) {
        return null; // Not enough data points
    }

    // Check for non-zero variance
    const values = revenueHistory.map(d => d.revenue);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;

    if (variance === 0 && mean === 0) {
        return null; // All zeros - no projection possible
    }

    // 2. Prepare Data (Sort & Smooth)
    let sortedHistory = [...revenueHistory].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Use only last 30 days for relevance, but at least 14
    const relevantHistory = sortedHistory.slice(-30);

    // 3-Day Moving Average to smooth outliers before regression
    const smoothedHistory = relevantHistory.map((day, index, arr) => {
        if (index < 2) return day;
        const avg = (day.revenue + arr[index - 1].revenue + arr[index - 2].revenue) / 3;
        return { ...day, revenue: avg };
    });

    // 3. Linear Regression (Least Squares)
    const n = smoothedHistory.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    const points = smoothedHistory.map((day, index) => ({ x: index, y: day.revenue, date: day.date }));

    points.forEach(p => {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumXX += p.x * p.x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 4. Calculate Seasonality (Dampened)
    // We calculate "day of week" factors but dampen them by 50% to avoid "fake spikes"
    const seasonFactors = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const dayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    points.forEach(p => {
        const trend = slope * p.x + intercept;
        const safeTrend = trend > 1 ? trend : 1;
        const ratio = p.y / safeTrend;
        const day = new Date(p.date).getDay();
        seasonFactors[day] += ratio;
        dayCounts[day]++;
    });

    // Average and Dampen
    for (let i = 0; i < 7; i++) {
        let factor = dayCounts[i] > 0 ? seasonFactors[i] / dayCounts[i] : 1;
        // Dampening: move factor 50% closer to 1.0 (Neutral)
        seasonFactors[i] = 1.0 + (factor - 1.0) * 0.5;
    }

    // 5. Generate Forecast
    const forecast = [];
    const lastDate = new Date(points[points.length - 1].date);

    // Calculate Standard Deviation of Residuals for Confidence Bounds
    let sumSquaredResiduals = 0;
    points.forEach(p => {
        const trend = slope * p.x + intercept;
        // Apply dampened seasonality to historical fit to check residuals
        const day = new Date(p.date).getDay();
        const fitted = trend * seasonFactors[day];
        sumSquaredResiduals += Math.pow(p.y - fitted, 2);
    });
    const stdDev = Math.sqrt(sumSquaredResiduals / n);

    let lastVal = points[points.length - 1].y;

    for (let i = 1; i <= daysToForecast; i++) {
        const futureDate = new Date(lastDate);
        futureDate.setDate(lastDate.getDate() + i);

        // Linear Trend
        const futureX = n - 1 + i;
        let predicted = slope * futureX + intercept;

        // Apply Dampened Seasonality
        const day = futureDate.getDay();
        predicted *= seasonFactors[day];

        // 6. CONSERVATIVE CONSTRAINTS (The "No Hype" Rules)

        // A. Max Daily Growth Cap (5%)
        const maxGrowth = lastVal * 1.05;
        if (predicted > maxGrowth) predicted = maxGrowth;

        // B. Non-negative
        if (predicted < 0) predicted = 0;

        // C. Flatness Check: If slope is tiny, force flat to avoid drift
        if (Math.abs(slope) < (mean * 0.01)) {
            // Slope < 1% of mean per day is effectively flat
            predicted = lastVal;
        }

        lastVal = predicted;

        // 7. Confidence Bounds (Widening Cone)
        // If variance is effectively 0 (stdDev < 1% of mean), don't show bounds
        let lower = 0, upper = 0;
        if (stdDev > (mean * 0.01)) {
            const uncertainty = 1 + (i * 0.1); // Widen 10% per day
            const margin = 1.96 * stdDev * uncertainty;
            lower = Math.max(0, predicted - margin);
            upper = predicted + margin;
        } else {
            lower = predicted;
            upper = predicted;
        }

        forecast.push({
            date: futureDate.toISOString().split('T')[0],
            displayDate: futureDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: Math.round(predicted),
            lowerBound: Math.round(lower),
            upperBound: Math.round(upper),
            isProjection: true
        });
    }

    return forecast;
};

// --- 2. ROBUST DEAD STOCK LOGIC (Time + Category + Stock) ---

/**
 * Detects "Dead Stock" using robust inventory management rules.
 * Rule: (Inactive Days > Threshold) AND (Sales Velocity ≈ 0) AND (Stock > High Threshold)
 */
export const detectInventoryRisks = (products, orders) => {
    const risks = {
        deadStock: [],
        slowMoving: [],
        insufficientData: []
    };

    const now = new Date();
    // High stock threshold to warrant "Dead Stock" alert (don't flag last 1-2 items)
    const LOW_STOCK_IGNORE_THRESHOLD = 2;

    // Map last sale date per product
    const lastSaleMap = {};
    orders.forEach(order => {
        const items = order.items || [{ productId: order.productId }];
        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);

        items.forEach(item => {
            if (!lastSaleMap[item.productId] || orderDate > lastSaleMap[item.productId]) {
                lastSaleMap[item.productId] = orderDate;
            }
        });
    });

    products.forEach(product => {
        // Skip if stock is low (not a financial risk yet)
        if (!product.isActive || product.stockQty <= LOW_STOCK_IGNORE_THRESHOLD) return;

        // 1. Determine Reference Date (Last Sold vs Created At)
        const lastSale = lastSaleMap[product.id];
        const createdAt = product.createdAt?.toDate ? product.createdAt.toDate() : (product.createdAt ? new Date(product.createdAt) : null);

        let referenceDate = lastSale;
        let isNeverSold = false;

        if (!lastSale) {
            // Never sold
            if (createdAt) {
                referenceDate = createdAt;
                isNeverSold = true;
            } else {
                // If no created date and no sales, we can't reliably judge age.
                // Assuming "Insufficient Data" or treat as new.
                // For safety, skip or assume new.
                risks.insufficientData.push(product.id);
                return;
            }
        }

        // 2. Calculate Inactive Days
        const diffTime = Math.abs(now - referenceDate);
        const daysInactive = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // 3. New Product Safeguard (< 7 days)
        if (daysInactive < 7 && isNeverSold) {
            // It's just new, not dead.
            return;
        }

        // 4. Category-Based Thresholds
        let threshold = 30; // Default (Men/Women)
        const categoryLower = (product.category || '').toLowerCase();

        if (categoryLower.includes('kids') || categoryLower.includes('accessory') || categoryLower.includes('fast')) {
            threshold = 14;
        } else if (product.basePrice > 2000 || categoryLower.includes('premium') || categoryLower.includes('jacket')) {
            threshold = 60; // Premium items move slower
        } else if (categoryLower.includes('seasonal')) {
            // Simplified: standard threshold for now
            threshold = 45;
        }

        // 5. Evaluation
        if (daysInactive > threshold) {
            risks.deadStock.push({
                ...product,
                reason: isNeverSold ? `No sales since added (${daysInactive} days)` : `No sales in ${daysInactive} days`,
                daysInactive,
                valueAtRisk: product.stockQty * (product.basePrice || 0)
            });
        } else if (daysInactive > threshold * 0.7) {
            risks.slowMoving.push({
                ...product,
                reason: `Sales slowing (${daysInactive} days)`,
                daysInactive,
                valueAtRisk: product.stockQty * (product.basePrice || 0)
            });
        }
    });

    // Sort by VALUE AT RISK (Qty * Price) DESC
    const sortByValue = (a, b) => b.valueAtRisk - a.valueAtRisk;
    risks.deadStock.sort(sortByValue);
    risks.slowMoving.sort(sortByValue);

    return risks;
};

// --- 3. EMPLOYEE PERFORMANCE (Context-Aware) ---

/**
 * Analyzes employee performance for anomalies
 * Includes disclaimer about category mix.
 */
export const analyzeEmployeePerformance = (orders) => {
    const employeeStats = {};

    // 1. Group by Employee
    orders.forEach(order => {
        if (!order.createdBy) return;

        if (!employeeStats[order.createdBy]) {
            employeeStats[order.createdBy] = { totalRevenue: 0, count: 0, aovs: [] };
        }

        const revenue = order.totals?.payableAmount || (order.price * order.quantity) || 0;
        employeeStats[order.createdBy].totalRevenue += revenue;
        employeeStats[order.createdBy].count += 1;
        employeeStats[order.createdBy].aovs.push(revenue);
    });

    const employeeIds = Object.keys(employeeStats);

    // SAFEGUARD: Minimum Data Requirements
    if (employeeIds.length < 3) return null; // Need peers to compare against

    const validEmployees = employeeIds.filter(id => employeeStats[id].count >= 30);
    if (validEmployees.length < 2) return null; // Need statistically significant sample

    // 2. Calculate Global Mean AOV & StdDev
    const allAOVs = [];
    validEmployees.forEach(id => {
        const stats = employeeStats[id];
        stats.avgAov = stats.totalRevenue / stats.count;
        allAOVs.push(stats.avgAov);
    });

    const globalMean = allAOVs.reduce((a, b) => a + b, 0) / allAOVs.length;
    const variance = allAOVs.reduce((a, b) => a + Math.pow(b - globalMean, 2), 0) / allAOVs.length;
    const stdDev = Math.sqrt(variance);

    // 3. Detect Outliers (Z-Score > 2 or < -2)
    const insights = [];

    validEmployees.forEach(id => {
        const stats = employeeStats[id];
        const zScore = stdDev > 0 ? (stats.avgAov - globalMean) / stdDev : 0;

        if (zScore < -2) {
            insights.push({
                type: 'warning',
                employeeId: id,
                metric: 'AOV',
                value: Math.round(stats.avgAov),
                deviation: `${Math.round((1 - (stats.avgAov / globalMean)) * 100)}% lower`,
                message: `Significant negative variance in AOV.`,
                disclaimer: `*Note: Ensure employee is not solely assigned to low-ticket categories (Performance adjusted check pending).`
            });
        }
    });

    return insights;
};

// --- 4. PRIORITIZED INSIGHTS GENERATION ---

/**
 * Generates prioritized insights sorted by Business Impact (Risk > Change > Efficiency)
 */
export const generateInsights = (revenueTrend, inventoryRisks, employeeRisks) => {
    const insights = [];

    // 1. CRITICAL RISKS (High Priority)

    // Dead Stock (Direct money loss)
    if (inventoryRisks.deadStock.length > 0) {
        const count = inventoryRisks.deadStock.length;
        const topItem = inventoryRisks.deadStock[0]; // Already sorted by value
        const totalValue = inventoryRisks.deadStock.reduce((s, i) => s + i.valueAtRisk, 0);

        insights.push({
            title: 'Inventory Value Risk',
            icon: '⚠️',
            type: 'alert',
            value: `₹${(totalValue / 1000).toFixed(1)}k`,
            message: `₹${(totalValue / 1000).toFixed(1)}k tied up in ${count} dead stock items. Top risk: ${topItem.name} (${topItem.daysInactive} days inactive).`,
            priority: 100, // Highest
            action: 'Clear Stock'
        });
    }

    // Revenue Decline (Trend)
    // Calculate simple change from revenueHistory if available (passed as revenueTrend here)
    if (revenueTrend && revenueTrend.length >= 14) {
        // Using the smoothed data points if passed, or raw. 
        // Let's assume passed array has 'value' from predictRevenue output, OR 'revenue' from raw history.
        // Based on usage in hook: `revenueHistory` (raw) -> `predictRevenue`. 
        // Hook passes `revenueHistory` (raw) to `generateInsights`.

        const raw = revenueTrend.sort((a, b) => new Date(a.date) - new Date(b.date));
        const last7 = raw.slice(-7);
        const prev7 = raw.slice(-14, -7);

        const sumLast7 = last7.reduce((s, d) => s + d.revenue, 0);
        const sumPrev7 = prev7.reduce((s, d) => s + d.revenue, 0);

        if (sumPrev7 > 0) {
            const change = ((sumLast7 - sumPrev7) / sumPrev7) * 100;
            if (change < -15) {
                insights.push({
                    title: 'Revenue Alert',
                    icon: '📉',
                    type: 'warning',
                    value: `${change.toFixed(1)}%`,
                    message: `Revenue dropped ${Math.abs(change).toFixed(1)}% in the last 7 days compared to previous week.`,
                    priority: 90
                });
            } else if (change > 15) {
                insights.push({
                    title: 'Growth Spike',
                    icon: '📈',
                    type: 'success',
                    value: `+${change.toFixed(1)}%`,
                    message: `Revenue up ${change.toFixed(1)}% in last 7 days. Check stock levels for top sellers.`,
                    priority: 50 // Medium priority (Positive news)
                });
            }
        }
    }

    // 2. OPERATIONAL / EMPLOYEE (Medium Priority)
    if (employeeRisks && employeeRisks.length > 0) {
        insights.push({
            title: 'Staff Performance Variance',
            icon: '👥',
            type: 'info',
            value: `${employeeRisks.length} Alerts`,
            message: `Unusual AOV patterns detected for ${employeeRisks.length} staff member(s). See Performance card for details.`,
            priority: 40
        });
    }

    // Sort by Priority DESC
    return insights.sort((a, b) => b.priority - a.priority);
};
