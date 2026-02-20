import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useView } from '../../contexts/ViewContext';
import { useOwnerAnalyticsPro } from '../../hooks/useOwnerAnalyticsPro';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import { exportAnalyticsData } from '../../utils/excelUtils';
import MaharashtraExhibitionMap from '../../components/maps/MaharashtraExhibitionMap';
import '../../styles/OwnerAnalyticsPro.css';

const OwnerAnalyticsPro = () => {
  const { logout } = useAuth();
  const { navigateToView, VIEWS } = useView();

  const [filters, setFilters] = useState({
    dateRange: 'month',
    startDate: '',
    endDate: '',
    orderType: 'all',
    category: 'all',
    employee: 'all'
  });

  const [mapData, setMapData] = useState({
    exhibitions: [],
    orders: [],
    loading: true
  });

  const { analytics, loading, error, employees, categories } = useOwnerAnalyticsPro(filters);

  // Load exhibitions and orders for the map
  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = async () => {
    try {
      const { getAllExhibitions } = await import('../../services/exhibitionService');
      const { getAllOrders } = await import('../../services/orderService');
      
      const [exhibitionsData, ordersData] = await Promise.all([
        getAllExhibitions(),
        getAllOrders()
      ]);
      
      setMapData({
        exhibitions: exhibitionsData,
        orders: ordersData.filter(o => o.status === 'completed'),
        loading: false
      });
    } catch (err) {
      console.error('Error loading map data:', err);
      setMapData(prev => ({ ...prev, loading: false }));
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigateToView(VIEWS.LOGIN);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleExportAnalytics = () => {
    try {
      exportAnalyticsData(analytics, filters);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export analytics data');
    }
  };

  const formatCurrency = (amount) => {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  };

  const formatPercent = (value) => {
    if (value === 0 || isNaN(value) || !isFinite(value)) {
      return '0.0%';
    }
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Debug: Log analytics data
  console.log('Analytics Data:', {
    totalRevenue: analytics.totalRevenue,
    totalOrders: analytics.totalOrders,
    revenueGrowth: analytics.revenueGrowth,
    ordersGrowth: analytics.ordersGrowth,
    paymentMethodAnalysis: analytics.paymentMethodAnalysis,
    categoryPerformance: analytics.categoryPerformance,
    periodComparison: analytics.periodComparison
  });

  // Chart colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];

      // For pie charts, the data structure is different
      if (data.payload && data.payload.category) {
        const category = String(data.payload.category || '');
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

        // Calculate percentage manually to be safe
        let percentage = '0.0';
        if (data.percent) {
          percentage = (data.percent * 100).toFixed(1);
        } else {
          // Fallback calculation
          const totalCategoryRevenue = analytics.categoryPerformance.reduce((sum, item) => sum + item.revenue, 0);
          if (totalCategoryRevenue > 0) {
            percentage = ((data.value / totalCategoryRevenue) * 100).toFixed(1);
          }
        }

        return (
          <div className="custom-tooltip">
            <p className="tooltip-label">{categoryName}</p>
            <p style={{ color: '#fff' }}>
              <strong>Revenue:</strong> {formatCurrency(data.value)}
            </p>
            <p style={{ color: '#fff' }}>
              <strong>Percentage:</strong> {percentage}%
            </p>
            <p style={{ color: '#fff' }}>
              <strong>Orders:</strong> {data.payload.orders}
            </p>
            <p style={{ color: '#fff' }}>
              <strong>Avg Value:</strong> {formatCurrency(data.payload.avgValue)}
            </p>
          </div>
        );
      }

      // For payment method pie chart
      if (data.payload && data.payload.method) {
        // Calculate percentage manually to be safe
        let percentage = '0.0';
        if (data.percent) {
          percentage = (data.percent * 100).toFixed(1);
        } else {
          // Fallback calculation for payment methods
          const totalPaymentRevenue = analytics.paymentMethodAnalysis.reduce((sum, item) => sum + item.revenue, 0);
          if (totalPaymentRevenue > 0) {
            percentage = ((data.value / totalPaymentRevenue) * 100).toFixed(1);
          }
        }

        return (
          <div className="custom-tooltip">
            <p className="tooltip-label">{data.payload.method}</p>
            <p style={{ color: '#fff' }}>
              <strong>Revenue:</strong> {formatCurrency(data.value)}
            </p>
            <p style={{ color: '#fff' }}>
              <strong>Percentage:</strong> {percentage}%
            </p>
            <p style={{ color: '#fff' }}>
              <strong>Transactions:</strong> {data.payload.count}
            </p>
          </div>
        );
      }

      // For other charts
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => {
            const name = entry.name || entry.dataKey || '';
            const isMoneyValue = typeof name === 'string' &&
              (name.toLowerCase().includes('revenue') ||
                name.toLowerCase().includes('value') ||
                name.toLowerCase().includes('avg'));

            return (
              <p key={index} style={{ color: '#fff' }}>
                <strong>{name}:</strong> {isMoneyValue ? formatCurrency(entry.value) : entry.value}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="analytics-pro-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="analytics-pro">
      {/* Header */}
      <div className="analytics-pro-header">
        <div className="header-content">
          <div>
            <h1>Business Analytics</h1>
            <p className="subtitle">Comprehensive insights for data-driven decisions</p>
          </div>
          <div className="header-actions">
            <button onClick={handleExportAnalytics} className="btn-secondary">
              📊 Export Data
            </button>
            <button onClick={() => navigateToView(VIEWS.OWNER_DASHBOARD)} className="btn-secondary">
              ← Dashboard
            </button>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* Advanced Filters */}
      <div className="filters-panel">
        <h3>Filters & Analysis Period</h3>
        <div className="filters-grid">
          <div className="filter-item">
            <label>Time Period</label>
            <select value={filters.dateRange} onChange={(e) => handleFilterChange('dateRange', e.target.value)}>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {filters.dateRange === 'custom' && (
            <>
              <div className="filter-item">
                <label>From</label>
                <input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} />
              </div>
              <div className="filter-item">
                <label>To</label>
                <input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} />
              </div>
            </>
          )}

          <div className="filter-item">
            <label>Sales Channel</label>
            <select value={filters.orderType} onChange={(e) => handleFilterChange('orderType', e.target.value)}>
              <option value="all">All Channels</option>
              <option value="daily">Store Sales</option>
              <option value="exhibition">Exhibition Sales</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Category</label>
            <select value={filters.category} onChange={(e) => handleFilterChange('category', e.target.value)}>
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>Employee</label>
            <select value={filters.employee} onChange={(e) => handleFilterChange('employee', e.target.value)}>
              <option value="all">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-header">
            <span className="metric-label">Total Revenue</span>
            <span className={`metric-trend ${analytics.revenueGrowth >= 0 ? 'positive' : 'negative'}`}>
              {formatPercent(analytics.revenueGrowth)}
            </span>
          </div>
          <div className="metric-value">{formatCurrency(analytics.totalRevenue || 0)}</div>
          <div className="metric-footer">vs previous period</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Orders</span>
            <span className={`metric-trend ${analytics.ordersGrowth >= 0 ? 'positive' : 'negative'}`}>
              {formatPercent(analytics.ordersGrowth)}
            </span>
          </div>
          <div className="metric-value">{analytics.totalOrders || 0}</div>
          <div className="metric-footer">vs previous period</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Avg Order Value</span>
            <span className={`metric-trend ${analytics.aovGrowth >= 0 ? 'positive' : 'negative'}`}>
              {formatPercent(analytics.aovGrowth)}
            </span>
          </div>
          <div className="metric-value">{formatCurrency(analytics.avgOrderValue || 0)}</div>
          <div className="metric-footer">per transaction</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Items Sold</span>
            <span className={`metric-trend ${analytics.itemsGrowth >= 0 ? 'positive' : 'negative'}`}>
              {formatPercent(analytics.itemsGrowth)}
            </span>
          </div>
          <div className="metric-value">{analytics.totalItemsSold || 0}</div>
          <div className="metric-footer">total units</div>
        </div>
      </div>

      {/* Show message if no data */}
      {analytics.totalOrders === 0 && (
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto 24px',
          padding: '0 32px'
        }}>
          <div style={{
            background: '#fef3c7',
            border: '2px solid #fbbf24',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#92400e' }}>No Data Available</h3>
            <p style={{ margin: 0, color: '#78350f' }}>
              There are no completed orders in the selected period. Create some sales to see analytics data.
            </p>
          </div>
        </div>
      )}

      {/* Business Insights */}
      {analytics.insights && analytics.insights.length > 0 && (
        <div className="insights-panel">
          <h3>📊 Business Insights & Recommendations</h3>
          <div className="insights-grid">
            {analytics.insights.map((insight, idx) => (
              <div key={idx} className={`insight-card ${insight.type}`}>
                <div className="insight-icon">{insight.icon}</div>
                <div className="insight-content">
                  <h4>{insight.title}</h4>
                  <p>{insight.message}</p>
                  {insight.action && <button className="insight-action">{insight.action}</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="charts-section">
        {/* Revenue Comparison - Bar Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Revenue Comparison</h3>
              <p className="chart-subtitle">
                {filters.dateRange === 'today' && 'Today vs Yesterday'}
                {filters.dateRange === 'week' && 'This Week vs Last Week'}
                {filters.dateRange === 'month' && 'This Month vs Last Month'}
                {filters.dateRange === 'quarter' && 'This Quarter vs Last Quarter'}
                {filters.dateRange === 'year' && 'This Year vs Last Year'}
                {filters.dateRange === 'custom' && 'Current Period vs Previous Period'}
              </p>
            </div>
          </div>
          <div className="chart-body">
            {analytics.periodComparison ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    {
                      metric: 'Revenue',
                      Previous: analytics.periodComparison.revenue.previous,
                      Current: analytics.periodComparison.revenue.current
                    }
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="metric"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '10px' }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="Previous"
                    fill="#9ca3af"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1500}
                    barSize={40}
                  />
                  <Bar
                    dataKey="Current"
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1700}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No comparison data available</div>
            )}
          </div>
        </div>

        {/* Volume Comparison - Bar Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Volume Comparison</h3>
              <p className="chart-subtitle">Orders & Items Sold</p>
            </div>
          </div>
          <div className="chart-body">
            {analytics.periodComparison ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    {
                      metric: 'Orders',
                      Previous: analytics.periodComparison.orders.previous,
                      Current: analytics.periodComparison.orders.current
                    },
                    {
                      metric: 'Items Sold',
                      Previous: analytics.periodComparison.items.previous,
                      Current: analytics.periodComparison.items.current
                    }
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="metric"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '10px' }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="Previous"
                    fill="#9ca3af"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1500}
                    barSize={40}
                  />
                  <Bar
                    dataKey="Current"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1700}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No comparison data available</div>
            )}
          </div>
        </div>

        {/* Revenue Trend - Main Chart */}
        <div className="chart-card chart-primary">
          <div className="chart-header">
            <div>
              <h3>Revenue & Orders Trend</h3>
              <p className="chart-subtitle">Daily performance tracking</p>
            </div>
          </div>
          <div className="chart-body">
            {analytics.revenueTrend && analytics.revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={analytics.revenueTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    animationDuration={1500}
                    dot={false}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorOrders)"
                    animationDuration={1500}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No revenue data available</div>
            )}
          </div>
        </div>

        {/* Top Products Performance */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Top Performing Products</h3>
              <p className="chart-subtitle">Revenue by product</p>
            </div>
          </div>
          <div className="chart-body">
            {analytics.topProducts && analytics.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={analytics.topProducts.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    width={95}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="revenue"
                    fill="#2563eb"
                    radius={[0, 4, 4, 0]}
                    animationDuration={1500}
                    barSize={20}
                  >
                    {analytics.topProducts.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No product data</div>
            )}
          </div>
        </div>

        {/* Category Revenue Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Revenue by Category</h3>
              <p className="chart-subtitle">Sales distribution</p>
            </div>
          </div>
          <div className="chart-body chart-center">
            {analytics.categoryPerformance && analytics.categoryPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={analytics.categoryPerformance}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={110}
                    fill="#8884d8"
                    paddingAngle={3}
                    dataKey="revenue"
                    nameKey="category"
                    animationDuration={1500}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, category, percent }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 25;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      const catName = String(category || '');
                      const displayName = catName.charAt(0).toUpperCase() + catName.slice(1);

                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#111827"
                          textAnchor={x > cx ? 'start' : 'end'}
                          dominantBaseline="central"
                          style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            textShadow: '0 0 3px white, 0 0 3px white, 0 0 3px white'
                          }}
                        >
                          {`${displayName} ${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                    labelLine={{
                      stroke: '#6b7280',
                      strokeWidth: 1.5
                    }}
                  >
                    {analytics.categoryPerformance.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No category data</div>
            )}
          </div>
        </div>

        {/* Payment Method Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Payment Method Distribution</h3>
              <p className="chart-subtitle">Revenue by payment mode</p>
            </div>
          </div>
          <div className="chart-body chart-center">
            {analytics.paymentMethodAnalysis && analytics.paymentMethodAnalysis.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={analytics.paymentMethodAnalysis}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={110}
                    fill="#8884d8"
                    paddingAngle={3}
                    dataKey="revenue"
                    nameKey="method"
                    animationDuration={1500}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, method, percent }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 25;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);

                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#111827"
                          textAnchor={x > cx ? 'start' : 'end'}
                          dominantBaseline="central"
                          style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            textShadow: '0 0 3px white, 0 0 3px white, 0 0 3px white'
                          }}
                        >
                          {`${method} ${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                    labelLine={{
                      stroke: '#6b7280',
                      strokeWidth: 1.5
                    }}
                  >
                    {analytics.paymentMethodAnalysis.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No payment data</div>
            )}
          </div>
        </div>

        {/* Category Growth Analysis */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Category Growth Rate</h3>
              <p className="chart-subtitle">Period-over-period comparison</p>
            </div>
          </div>
          <div className="chart-body">
            {analytics.categoryPerformance && analytics.categoryPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={analytics.categoryPerformance}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="category"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    tickFormatter={(value) => `${value}%`}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '10px' }}
                    iconType="circle"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="revenue"
                    name="Revenue"
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1500}
                    barSize={40}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="growth"
                    name="Growth %"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1700}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No category data</div>
            )}
          </div>
        </div>

        {/* Employee Performance */}
        <div className="chart-card chart-wide">
          <div className="chart-header">
            <div>
              <h3>Employee Performance Metrics</h3>
              <p className="chart-subtitle">Revenue and order volume by employee</p>
            </div>
          </div>
          <div className="chart-body">
            {analytics.employeePerformance && analytics.employeePerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={analytics.employeePerformance}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '10px' }}
                    iconType="circle"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="revenue"
                    name="Revenue"
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1500}
                    barSize={50}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="orders"
                    name="Orders"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1700}
                    barSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No employee data</div>
            )}
          </div>
        </div>

        {/* Average Order Value Trend */}
        <div className="chart-card chart-wide">
          <div className="chart-header">
            <div>
              <h3>Average Order Value Trend</h3>
              <p className="chart-subtitle">Customer spending patterns over time</p>
            </div>
          </div>
          <div className="chart-body">
            {analytics.revenueTrend && analytics.revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart
                  data={analytics.revenueTrend.map(d => ({
                    ...d,
                    aov: d.orders > 0 ? Math.round(d.revenue / d.orders) : 0
                  }))}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(1)}k`}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                  <Line
                    type="monotone"
                    dataKey="aov"
                    name="Avg Order Value"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ fill: '#f59e0b', r: 5, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7 }}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No trend data available</div>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        {analytics.lowStockProducts && analytics.lowStockProducts.length > 0 && (
          <div className="chart-card alert-card chart-wide">
            <div className="chart-header">
              <div>
                <h3>⚠️ Inventory Alert</h3>
                <p className="chart-subtitle">Products requiring immediate attention</p>
              </div>
            </div>
            <div className="chart-body">
              <div className="stock-grid">
                {analytics.lowStockProducts.slice(0, 8).map((product, idx) => (
                  <div key={idx} className="stock-card">
                    <div className="stock-info">
                      <h4>{product.name}</h4>
                      <span className="stock-sku">SKU: {product.sku}</span>
                    </div>
                    <div className="stock-status">
                      <span className={`stock-badge ${product.stockQty === 0 ? 'out' : 'low'}`}>
                        {product.stockQty === 0 ? 'OUT OF STOCK' : `${product.stockQty} units left`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Exhibitions Timeline Section */}
        <ExhibitionsTimeline />

        {/* Maharashtra Exhibition Map */}
        {!mapData.loading && (
          <div className="chart-card chart-wide" style={{ gridColumn: '1 / -1' }}>
            <MaharashtraExhibitionMap 
              exhibitions={mapData.exhibitions} 
              orders={mapData.orders}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Exhibitions Timeline Component
const ExhibitionsTimeline = () => {
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExhibitions();
  }, []);

  const loadExhibitions = async () => {
    try {
      const { getAllExhibitions } = await import('../../services/exhibitionService');
      const { getAllOrders } = await import('../../services/orderService');
      
      const [exhibitionsData, ordersData] = await Promise.all([
        getAllExhibitions(),
        getAllOrders()
      ]);
      
      console.log('Owner - All orders:', ordersData);
      console.log('Owner - All exhibitions:', exhibitionsData);
      
      // Filter for this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      const thisMonthExhibitions = exhibitionsData.filter(ex => {
        const createdAt = ex.createdAt?.toDate ? ex.createdAt.toDate() : new Date(ex.createdAt);
        return createdAt >= startOfMonth && createdAt <= endOfMonth;
      });
      
      console.log('Owner - This month exhibitions:', thisMonthExhibitions);
      
      // Calculate sales for each exhibition
      const exhibitionsWithSales = thisMonthExhibitions.map(ex => {
        const exhibitionOrders = ordersData.filter(order => {
          const matchesExhibition = order.exhibitionId === ex.id;
          const isCompleted = order.status === 'completed';
          
          console.log(`Owner - Order ${order.id}:`, {
            exhibitionId: order.exhibitionId,
            targetExhibitionId: ex.id,
            matchesExhibition,
            status: order.status,
            isCompleted,
            type: order.type,
            willInclude: matchesExhibition && isCompleted
          });
          
          return matchesExhibition && isCompleted;
        });
        
        console.log(`Owner - Exhibition ${ex.location} (${ex.id}):`, {
          totalOrders: exhibitionOrders.length,
          orders: exhibitionOrders
        });
        
        const totalSales = exhibitionOrders.reduce((sum, order) => {
          return sum + (order.totals?.payableAmount || 0);
        }, 0);
        
        return {
          ...ex,
          salesCount: exhibitionOrders.length,
          totalRevenue: totalSales
        };
      });
      
      console.log('Owner - Exhibitions with sales:', exhibitionsWithSales);
      setExhibitions(exhibitionsWithSales);
    } catch (err) {
      console.error('Error loading exhibitions:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="chart-card chart-wide">
        <div className="chart-header">
          <h3>This Month's Exhibitions</h3>
        </div>
        <div className="chart-body">
          <div className="chart-empty">Loading exhibitions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card chart-wide">
      <div className="chart-header">
        <div>
          <h3>This Month's Exhibitions</h3>
          <p className="chart-subtitle">All exhibitions - active and completed</p>
        </div>
      </div>
      <div className="chart-body">
        {exhibitions.length === 0 ? (
          <div className="chart-empty">No exhibitions this month</div>
        ) : (
          <div style={{ padding: '20px' }}>
            {exhibitions.map((ex) => {
              // Properly handle Firestore timestamps
              const startDate = ex.startTime?.toDate 
                ? ex.startTime.toDate() 
                : (ex.startTime ? new Date(ex.startTime) : (ex.createdAt?.toDate ? ex.createdAt.toDate() : new Date()));
              const endDate = ex.endTime?.toDate ? ex.endTime.toDate() : null;
              const isOngoing = ex.active;
              
              return (
                <div 
                  key={ex.id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    marginBottom: '12px',
                    background: isOngoing ? '#dbeafe' : '#f3f4f6',
                    borderRadius: '8px',
                    border: `2px solid ${isOngoing ? '#3b82f6' : '#9ca3af'}`,
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: isOngoing ? '#10b981' : '#6b7280',
                    marginRight: '16px',
                    flexShrink: 0,
                    boxShadow: isOngoing ? '0 0 0 4px rgba(16, 185, 129, 0.2)' : 'none'
                  }} />
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      marginBottom: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <h4 style={{ 
                        margin: 0, 
                        fontSize: '16px', 
                        fontWeight: '600',
                        color: '#111827'
                      }}>
                        {ex.location}
                      </h4>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: isOngoing ? '#10b981' : '#6b7280',
                        color: 'white',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {isOngoing ? '🟢 Ongoing' : '✓ Completed'}
                      </span>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: '24px',
                      fontSize: '13px',
                      color: '#6b7280',
                      flexWrap: 'wrap'
                    }}>
                      <div>
                        <span style={{ fontWeight: '500' }}>Started:</span>{' '}
                        {startDate.toLocaleDateString('en-IN', { 
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      {endDate && (
                        <div>
                          <span style={{ fontWeight: '500' }}>Ended:</span>{' '}
                          {endDate.toLocaleDateString('en-IN', { 
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      )}
                      {!endDate && isOngoing && (
                        <div style={{ color: '#10b981', fontWeight: '500' }}>
                          ⏱️ In Progress
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                    <div style={{
                      padding: '8px 16px',
                      background: 'white',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#111827',
                      border: '1px solid #e5e7eb',
                      textAlign: 'center'
                    }}>
                      {(() => {
                        if (isOngoing) {
                          const duration = Math.floor((new Date() - startDate) / (1000 * 60 * 60));
                          return `${duration}h running`;
                        } else if (endDate) {
                          const duration = Math.floor((endDate - startDate) / (1000 * 60 * 60));
                          return `${duration}h duration`;
                        }
                        return 'N/A';
                      })()}
                    </div>
                    
                    <div style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'white',
                      textAlign: 'center',
                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                    }}>
                      {ex.salesCount || 0} sales
                    </div>
                    
                    <div style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'white',
                      textAlign: 'center',
                      boxShadow: '0 2px 8px rgba(245, 87, 108, 0.3)'
                    }}>
                      ₹{(ex.totalRevenue || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              );
            })}
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginTop: '20px',
              padding: '16px',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                  {exhibitions.length}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Total This Month
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                  {exhibitions.filter(ex => ex.active).length}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Ongoing
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#6b7280' }}>
                  {exhibitions.filter(ex => !ex.active).length}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Completed
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerAnalyticsPro;
