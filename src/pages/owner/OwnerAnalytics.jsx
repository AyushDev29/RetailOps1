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
  const { analytics, loading, error } = useOwnerAnalytics();

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
              🟢 Live Data
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
          icon="💰"
        />
        <StatsCard
          title="Daily Sales Revenue"
          value={formatCurrency(analytics.dailySalesRevenue)}
          icon="🏪"
        />
        <StatsCard
          title="Exhibition Sales Revenue"
          value={formatCurrency(analytics.exhibitionSalesRevenue)}
          icon="🎪"
        />
        <StatsCard
          title="Top Product Revenue"
          value={formatCurrency(analytics.topSellingProduct.revenue)}
          icon="⭐"
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
                  <h4>Detected Anomalies:</h4>
                  <p className="anomaly-description">
                    Spike: Revenue &gt; 2× rolling 7-day average | Drop: Revenue &lt; 0.5× rolling 7-day average
                  </p>
                  {analytics.anomalies.map((anomaly, index) => (
                    <div key={index} className={`anomaly-item ${anomaly.type}`}>
                      <span className="anomaly-icon">
                        {anomaly.type === 'spike' ? '📈' : '📉'}
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
