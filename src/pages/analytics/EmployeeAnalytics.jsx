import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useView } from '../../contexts/ViewContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import { getExhibitionsForFilter } from '../../services/analyticsService';
import { getAllExhibitions } from '../../services/exhibitionService';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import '../../styles/EmployeeAnalytics.css';

const EmployeeAnalytics = () => {
  const { user, userProfile, logout } = useAuth();
  const { navigateToView, VIEWS } = useView();
  
  // Filters state
  const [filters, setFilters] = useState({
    period: 'monthly', // 'daily' | 'weekly' | 'monthly'
    gender: '', // '' | 'Male' | 'Female' | 'Other'
    ageGroup: '', // '' | '18-25' | '26-35' | '36-45' | '45+'
    exhibitionId: '',
    employeeId: user?.uid || ''
  });
  
  const [exhibitions, setExhibitions] = useState([]);
  const [exhibitionMap, setExhibitionMap] = useState({});
  const [myExhibitions, setMyExhibitions] = useState([]);
  
  // Fetch analytics using custom hook
  const { analytics, loading, error } = useAnalytics(filters);
  
  // Chart colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      
      // For pie charts
      if (data.payload && data.name) {
        const percentage = data.percent ? (data.percent * 100).toFixed(1) : '';
        return (
          <div className="custom-tooltip">
            <p className="tooltip-label">{data.name}</p>
            <p style={{ color: '#fff' }}>
              <strong>Sales:</strong> {data.value}
            </p>
            {percentage && (
              <p style={{ color: '#fff' }}>
                <strong>Percentage:</strong> {percentage}%
              </p>
            )}
          </div>
        );
      }
      
      // For bar charts
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: '#fff' }}>
              <strong>{entry.name}:</strong> {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Load exhibitions for filter
  useEffect(() => {
    loadExhibitions();
    loadMyExhibitions();
  }, []);
  
  const loadExhibitions = async () => {
    try {
      const data = await getExhibitionsForFilter();
      setExhibitions(data);
      // Build exhibition map for ID -> location lookup
      const map = {};
      data.forEach(ex => {
        map[ex.id] = ex.location;
      });
      setExhibitionMap(map);
    } catch (err) {
      console.error('Error loading exhibitions:', err);
    }
  };
  
  const loadMyExhibitions = async () => {
    try {
      // Get ALL exhibitions (not just current user's)
      const data = await getAllExhibitions();
      
      // Filter for this month only
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      const thisMonthExhibitions = data.filter(ex => {
        const createdAt = ex.createdAt?.toDate ? ex.createdAt.toDate() : new Date(ex.createdAt);
        return createdAt >= startOfMonth && createdAt <= endOfMonth;
      });
      
      setMyExhibitions(thisMonthExhibitions);
    } catch (err) {
      console.error('Error loading exhibitions:', err);
    }
  };
  
  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      period: 'monthly',
      gender: '',
      ageGroup: '',
      exhibitionId: '',
      employeeId: user?.uid || ''
    });
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigateToView(VIEWS.LOGIN);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleBackToDashboard = () => {
    navigateToView(VIEWS.EMPLOYEE_DASHBOARD);
  };
  
  // Get period-accurate label for comparison chart
  const getComparisonLabel = () => {
    if (filters.period === 'daily') return 'Today vs Yesterday';
    if (filters.period === 'weekly') return 'This Week vs Last Week';
    return 'Current Month vs Last Month';
  };
  
  // Format hour for display (IST)
  const formatHour = (hour) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };
  
  // Get peak age group
  const getPeakAgeGroup = () => {
    const { peakSalesAgeGroup } = analytics;
    let maxGroup = '18-25';
    let maxCount = 0;
    
    Object.entries(peakSalesAgeGroup).forEach(([group, count]) => {
      if (count > maxCount) {
        maxGroup = group;
        maxCount = count;
      }
    });
    
    return { group: maxGroup, count: maxCount };
  };
  
  // Get peak gender
  const getPeakGender = () => {
    const { peakSalesGender } = analytics;
    let maxGender = 'Male';
    let maxCount = 0;
    
    Object.entries(peakSalesGender).forEach(([gender, count]) => {
      if (count > maxCount) {
        maxGender = gender;
        maxCount = count;
      }
    });
    
    return { gender: maxGender, count: maxCount };
  };
  
  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }
  
  return (
    <div className="employee-analytics">
      <div className="analytics-header">
        <div className="header-content">
          <div>
            <h1>Employee Analytics</h1>
            <p>Welcome, {userProfile?.name || user?.email}</p>
            <span className="live-indicator" title="Data updates in real-time">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10"/>
              </svg>
              Live Data
            </span>
          </div>
          <div className="header-actions">
            <button onClick={handleBackToDashboard} className="btn btn-secondary">
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
        <h2>Filters</h2>
        <div className="filters-grid">
          {/* Period Toggle */}
          <div className="filter-group">
            <label>Period</label>
            <div className="period-toggle">
              <button
                className={`toggle-btn ${filters.period === 'daily' ? 'active' : ''}`}
                onClick={() => handleFilterChange('period', 'daily')}
              >
                Daily
              </button>
              <button
                className={`toggle-btn ${filters.period === 'weekly' ? 'active' : ''}`}
                onClick={() => handleFilterChange('period', 'weekly')}
              >
                Weekly
              </button>
              <button
                className={`toggle-btn ${filters.period === 'monthly' ? 'active' : ''}`}
                onClick={() => handleFilterChange('period', 'monthly')}
              >
                Monthly
              </button>
            </div>
          </div>
          
          {/* Gender Filter */}
          <div className="filter-group">
            <label>Gender</label>
            <select
              value={filters.gender}
              onChange={(e) => handleFilterChange('gender', e.target.value)}
              className="filter-select"
            >
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          {/* Age Group Filter */}
          <div className="filter-group">
            <label>Age Group</label>
            <select
              value={filters.ageGroup}
              onChange={(e) => handleFilterChange('ageGroup', e.target.value)}
              className="filter-select"
            >
              <option value="">All Ages</option>
              <option value="0-12">0-12 (Kids)</option>
              <option value="13-19">13-19 (Teens)</option>
              <option value="20-35">20-35 (Young Adults)</option>
              <option value="36-50">36-50 (Adults)</option>
              <option value="51+">51+ (Seniors)</option>
            </select>
          </div>
          
          {/* Exhibition Filter */}
          <div className="filter-group">
            <label>Exhibition</label>
            <select
              value={filters.exhibitionId}
              onChange={(e) => handleFilterChange('exhibitionId', e.target.value)}
              className="filter-select"
            >
              <option value="">All Exhibitions</option>
              {exhibitions.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.location}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <button onClick={handleResetFilters} className="btn btn-secondary">
              Reset Filters
            </button>
          </div>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Peak Sales Time</h3>
            <p className="stat-value">{formatHour(analytics.peakSalesTime.hour)}</p>
            <span className="stat-label">{analytics.peakSalesTime.count} sales</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Peak Age Group</h3>
            <p className="stat-value">{getPeakAgeGroup().group}</p>
            <span className="stat-label">{getPeakAgeGroup().count} sales</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="7"/>
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Peak Gender</h3>
            <p className="stat-value">{getPeakGender().gender}</p>
            <span className="stat-label">{getPeakGender().count} sales</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="20" x2="12" y2="10"/>
              <line x1="18" y1="20" x2="18" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="16"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Total Sales</h3>
            <p className="stat-value">{analytics.dailySalesComparison.current}</p>
            <span className="stat-label">Current period</span>
          </div>
        </div>
      </div>
      
      {/* Charts Section */}
      <div className="charts-grid">
        {/* Sales Comparison Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>{getComparisonLabel()}</h3>
              <p className="chart-subtitle">Period comparison</p>
            </div>
          </div>
          <div className="chart-body">
            {analytics.dailySalesComparison.current === 0 && analytics.dailySalesComparison.previous === 0 ? (
              <div className="chart-empty">No data for selected period</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={[
                    { period: 'Previous', sales: analytics.dailySalesComparison.previous },
                    { period: 'Current', sales: analytics.dailySalesComparison.current }
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="period" 
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
                  <Bar 
                    dataKey="sales" 
                    name="Sales"
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]} 
                    animationDuration={1500}
                    barSize={80}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
        {/* Gender Distribution Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Sales by Gender</h3>
              <p className="chart-subtitle">Customer demographics</p>
            </div>
          </div>
          <div className="chart-body chart-center">
            {Object.values(analytics.peakSalesGender).every(v => v === 0) ? (
              <div className="chart-empty">No data for selected period</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(analytics.peakSalesGender).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    animationDuration={1500}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 20;
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
                            fontSize: '12px', 
                            fontWeight: '600',
                            textShadow: '0 0 3px white, 0 0 3px white'
                          }}
                        >
                          {`${name} ${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                    labelLine={{ stroke: '#6b7280', strokeWidth: 1.5 }}
                  >
                    {Object.keys(analytics.peakSalesGender).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
        {/* Age Group Distribution Chart */}
        <div className="chart-card chart-wide">
          <div className="chart-header">
            <div>
              <h3>Sales by Age Group</h3>
              <p className="chart-subtitle">Age demographics</p>
            </div>
          </div>
          <div className="chart-body">
            {Object.values(analytics.peakSalesAgeGroup).every(v => v === 0) ? (
              <div className="chart-empty">No data for selected period</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={Object.entries(analytics.peakSalesAgeGroup).map(([age, sales]) => ({ age, sales }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="age" 
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
                  <Bar 
                    dataKey="sales" 
                    name="Sales"
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]} 
                    animationDuration={1500}
                    barSize={50}
                  >
                    {Object.keys(analytics.peakSalesAgeGroup).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
        {/* Exhibition Sales Chart */}
        <div className="chart-card chart-wide">
          <div className="chart-header">
            <div>
              <h3>Sales by Exhibition</h3>
              <p className="chart-subtitle">Exhibition performance</p>
            </div>
          </div>
          <div className="chart-body">
            {analytics.exhibitionSalesComparison.length === 0 ? (
              <div className="chart-empty">No exhibition sales for selected period</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={analytics.exhibitionSalesComparison.map(ex => ({
                    exhibition: exhibitionMap[ex.exhibitionId] || 'Unknown',
                    sales: ex.count
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="exhibition" 
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
                  <Bar 
                    dataKey="sales" 
                    name="Sales"
                    fill="#f59e0b" 
                    radius={[4, 4, 0, 0]} 
                    animationDuration={1500}
                    barSize={60}
                  >
                    {analytics.exhibitionSalesComparison.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
        {/* This Month's Exhibitions Timeline */}
        <div className="chart-card chart-wide">
          <div className="chart-header">
            <div>
              <h3>This Month's Exhibitions</h3>
              <p className="chart-subtitle">All exhibitions by all employees</p>
            </div>
          </div>
          <div className="chart-body">
            {myExhibitions.length === 0 ? (
              <div className="chart-empty">No exhibitions this month</div>
            ) : (
              <div style={{ padding: '20px' }}>
                {myExhibitions.map((ex, index) => {
                  const startDate = ex.startTime ? new Date(ex.startTime) : (ex.createdAt?.toDate ? ex.createdAt.toDate() : new Date());
                  const endDate = ex.endTime?.toDate ? ex.endTime.toDate() : null;
                  const isOngoing = ex.active;
                  const isMyExhibition = ex.createdBy === user.uid;
                  
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
                      {/* Status Indicator */}
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: isOngoing ? '#10b981' : '#6b7280',
                        marginRight: '16px',
                        flexShrink: 0,
                        boxShadow: isOngoing ? '0 0 0 4px rgba(16, 185, 129, 0.2)' : 'none'
                      }} />
                      
                      {/* Exhibition Info */}
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
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: isMyExhibition ? '#8b5cf6' : '#64748b',
                            color: 'white'
                          }}>
                            {isMyExhibition ? '👤 You' : '👥 Colleague'}
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
                      
                      {/* Duration Badge */}
                      <div style={{
                        padding: '8px 16px',
                        background: 'white',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#111827',
                        border: '1px solid #e5e7eb'
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
                    </div>
                  );
                })}
                
                {/* Summary Stats */}
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
                      {myExhibitions.length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      Total This Month
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                      {myExhibitions.filter(ex => ex.active).length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      Ongoing
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#6b7280' }}>
                      {myExhibitions.filter(ex => !ex.active).length}
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
      </div>
    </div>
  );
};

export default EmployeeAnalytics;
