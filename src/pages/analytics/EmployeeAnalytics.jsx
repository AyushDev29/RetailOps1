import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAnalytics } from '../../hooks/useAnalytics';
import { getExhibitionsForFilter } from '../../services/analyticsService';
import ChartWrapper from '../../components/common/ChartWrapper';
import StatsCard from '../../components/common/StatsCard';
import BarChart from '../../components/charts/BarChart';
import PieChart from '../../components/charts/PieChart';
import '../../styles/EmployeeAnalytics.css';

const EmployeeAnalytics = () => {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  
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
  
  // Fetch analytics using custom hook
  const { analytics, loading, error } = useAnalytics(filters);
  
  // Load exhibitions for filter
  useEffect(() => {
    loadExhibitions();
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
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/employee');
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
              <option value="18-25">18-25</option>
              <option value="26-35">26-35</option>
              <option value="36-45">36-45</option>
              <option value="45+">45+</option>
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
        <StatsCard
          title="Peak Sales Time (IST)"
          value={`${formatHour(analytics.peakSalesTime.hour)} (${analytics.peakSalesTime.count} sales)`}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          }
        />
        <StatsCard
          title="Peak Age Group"
          value={`${getPeakAgeGroup().group} (${getPeakAgeGroup().count} sales)`}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          }
        />
        <StatsCard
          title="Peak Gender"
          value={`${getPeakGender().gender} (${getPeakGender().count} sales)`}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="7"/>
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
            </svg>
          }
        />
        <StatsCard
          title="Total Sales"
          value={`${analytics.dailySalesComparison.current} sales`}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="20" x2="12" y2="10"/>
              <line x1="18" y1="20" x2="18" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="16"/>
            </svg>
          }
        />
      </div>
      
      {/* Charts Section */}
      <div className="charts-grid">
        {/* Sales Comparison Chart */}
        <ChartWrapper title={getComparisonLabel()}>
          {analytics.dailySalesComparison.current === 0 && analytics.dailySalesComparison.previous === 0 ? (
            <div className="chart-empty">No data for selected period</div>
          ) : (
            <BarChart
              data={{
                labels: ['Previous Period', 'Current Period'],
                values: [
                  analytics.dailySalesComparison.previous,
                  analytics.dailySalesComparison.current
                ]
              }}
            />
          )}
        </ChartWrapper>
        
        {/* Gender Distribution Chart */}
        <ChartWrapper title="Sales by Gender">
          {Object.values(analytics.peakSalesGender).every(v => v === 0) ? (
            <div className="chart-empty">No data for selected period</div>
          ) : (
            <PieChart
              data={{
                labels: Object.keys(analytics.peakSalesGender),
                values: Object.values(analytics.peakSalesGender)
              }}
            />
          )}
        </ChartWrapper>
        
        {/* Age Group Distribution Chart */}
        <ChartWrapper title="Sales by Age Group">
          {Object.values(analytics.peakSalesAgeGroup).every(v => v === 0) ? (
            <div className="chart-empty">No data for selected period</div>
          ) : (
            <BarChart
              data={{
                labels: Object.keys(analytics.peakSalesAgeGroup),
                values: Object.values(analytics.peakSalesAgeGroup)
              }}
            />
          )}
        </ChartWrapper>
        
        {/* Exhibition Sales Chart */}
        {analytics.exhibitionSalesComparison.length > 0 ? (
          <ChartWrapper title="Sales by Exhibition">
            <BarChart
              data={{
                labels: analytics.exhibitionSalesComparison.map(ex => 
                  exhibitionMap[ex.exhibitionId] || 'Unknown Exhibition'
                ),
                values: analytics.exhibitionSalesComparison.map(ex => ex.count)
              }}
            />
          </ChartWrapper>
        ) : (
          <ChartWrapper title="Sales by Exhibition">
            <div className="chart-empty">No exhibition sales for selected period</div>
          </ChartWrapper>
        )}
      </div>
    </div>
  );
};

export default EmployeeAnalytics;
