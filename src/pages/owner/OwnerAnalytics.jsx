import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useOwnerAnalytics } from '../../hooks/useOwnerAnalytics';
import ChartWrapper from '../../components/common/ChartWrapper';
import StatsCard from '../../components/common/StatsCard';
import BarChart from '../../components/charts/BarChart';
import LineChart from '../../components/charts/LineChart';
import MultiLineChart from '../../components/charts/MultiLineChart';
import '../../styles/OwnerAnalytics.css';

const OwnerAnalytics = () => {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  
  // Filters state
  const [filters, setFilters] = useState({
    dateRange: 'all', // 'all', 'today', 'week', 'month', 'custom'
    orderType: 'all', // 'all', 'daily', 'exhibition'
    startDate: '',
    endDate: ''
  });
  
  const { analytics, loading, error } = useOwnerAnalytics(filters);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  if (loading) {
    return <div className="analytics-loading">Loading owner analytics...</div>;
  }

  return (
    <div className="owner-analytics">
      <div className="analytics-header">
        <div className="header-content">
          <div>
            <h1>Owner Analytics</h1>
            <p>Welcome, {userProfile?.name || user?.email}</p>
            <span className="live-indicator" title="Revenue data updates in real-time">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10"/>
              </svg>
              Live Data
            </span>
          </div>
          <div className="header-actions">
            <button onClick={() => navigate('/owner')} className="btn btn-secondary">
              Back to Dashboard
            </button>
            <button onClick={handleLogout} className="btn btn-logout">
              Logout
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filters Section */}
      <div className="filters-section">
        <h3>Filters</h3>
        <div className="filters-grid">
          {/* Date Range Filter */}
          <div className="filter-group">
            <label>Date Range</label>
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {filters.dateRange === 'custom' && (
            <>
              <div className="filter-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="filter-input"
                />
              </div>
              <div className="filter-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="filter-input"
                />
              </div>
            </>
          )}

          {/* Order Type Filter */}
          <div className="filter-group">
            <label>Order Type</label>
            <select
              value={filters.orderType}
              onChange={(e) => handleFilterChange('orderType', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="daily">Store Sales</option>
              <option value="exhibition">Exhibition Sales</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty state for no revenue */}
      {analytics.overallRevenue === 0 && (
        <div className="empty-state">
          <p>No revenue data available yet. Start creating orders to see analytics.</p>
        </div>
      )}

      {/* Revenue Cards */}
      <div className="stats-grid">
        <StatsCard
          title="Overall Revenue"
          value={formatCurrency(analytics.overallRevenue)}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          }
        />
        <StatsCard
          title="Daily Sales Revenue"
          value={formatCurrency(analytics.dailySalesRevenue)}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          }
        />
        <StatsCard
          title="Exhibition Sales Revenue"
          value={formatCurrency(analytics.exhibitionSalesRevenue)}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          }
        />
        <StatsCard
          title="Top Product Revenue"
          value={formatCurrency(analytics.topSellingProduct.revenue)}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          }
        />
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Monthly Revenue Comparison */}
        <ChartWrapper title="Current Month vs Last Month">
          {analytics.monthlyComparison.current === 0 && analytics.monthlyComparison.previous === 0 ? (
            <div className="chart-empty">No revenue data available</div>
          ) : (
            <BarChart
              data={{
                labels: ['Last Month', 'Current Month'],
                values: [
                  analytics.monthlyComparison.previous,
                  analytics.monthlyComparison.current
                ]
              }}
            />
          )}
        </ChartWrapper>

        {/* Top Selling Product */}
        <ChartWrapper title="Top Selling Product">
          {analytics.topSellingProduct.revenue === 0 ? (
            <div className="chart-empty">No product sales yet</div>
          ) : (
            <div className="top-product-card">
              <div className="product-info">
                <h3>{analytics.topSellingProduct.name}</h3>
                <p className="product-category">{analytics.topSellingProduct.category}</p>
                <p className="product-revenue">
                  {formatCurrency(analytics.topSellingProduct.revenue)}
                </p>
              </div>
            </div>
          )}
        </ChartWrapper>

        {/* Category Revenue Breakdown */}
        <ChartWrapper title="Revenue by Category">
          {analytics.categoryRevenue.length === 0 ? (
            <div className="chart-empty">No category data available</div>
          ) : (
            <BarChart
              data={{
                labels: analytics.categoryRevenue.map(c => c.category),
                values: analytics.categoryRevenue.map(c => c.revenue)
              }}
            />
          )}
        </ChartWrapper>

        {/* Revenue Trend with Anomalies */}
        <ChartWrapper title="Revenue Trend (Last 30 Days)">
          {analytics.revenueTrend.length === 0 ? (
            <div className="chart-empty">No trend data available</div>
          ) : (
            <div className="trend-container">
              <LineChart
                data={{
                  labels: analytics.revenueTrend.map(d => d.date),
                  values: analytics.revenueTrend.map(d => d.revenue)
                }}
                anomalies={analytics.anomalies}
              />
              {analytics.anomalies.length > 0 ? (
                <div className="anomalies-list">
                  <h4>Detected Anomalies</h4>
                  <p className="anomaly-description">
                    Spike: Revenue &gt; 2× rolling 7-day average | Drop: Revenue &lt; 0.5× rolling 7-day average
                  </p>
                  {analytics.anomalies.map((anomaly, index) => (
                    <div key={index} className={`anomaly-item ${anomaly.type}`}>
                      <span className="anomaly-icon">
                        {anomaly.type === 'spike' ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                            <polyline points="17 6 23 6 23 12"/>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
                            <polyline points="17 18 23 18 23 12"/>
                          </svg>
                        )}
                      </span>
                      <span className="anomaly-text">
                        <strong>{anomaly.type === 'spike' ? 'Spike' : 'Drop'}</strong> on {anomaly.date}: {formatCurrency(anomaly.value)}
                        <span className="anomaly-baseline"> (baseline: {formatCurrency(anomaly.baseline)})</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-anomalies">
                  <p>✓ No anomalies detected</p>
                </div>
              )}
            </div>
          )}
        </ChartWrapper>

        {/* Product Performance Over Time */}
        <ChartWrapper title="Product Performance Over Time (Top 3)">
          {analytics.productPerformance.series.length === 0 ? (
            <div className="chart-empty">No product performance data available</div>
          ) : (
            <MultiLineChart data={analytics.productPerformance} />
          )}
        </ChartWrapper>
      </div>
    </div>
  );
};

export default OwnerAnalytics;
