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
          </div>
          <button onClick={handleLogout} className="btn btn-logout">
            Logout
          </button>
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
          title="Peak Sales Time"
          value={`${formatHour(analytics.peakSalesTime.hour)} (${analytics.peakSalesTime.count} sales)`}
          icon="🕐"
        />
        <StatsCard
          title="Peak Age Group"
          value={`${getPeakAgeGroup().group} (${getPeakAgeGroup().count} sales)`}
          icon="👥"
        />
        <StatsCard
          title="Peak Gender"
          value={`${getPeakGender().gender} (${getPeakGender().count} sales)`}
          icon="⚧"
        />
        <StatsCard
          title="Total Sales"
          value={`${analytics.dailySalesComparison.current} sales`}
          icon="📊"
        />
      </div>
      
      {/* Charts Section */}
      <div className="charts-grid">
        {/* Sales Comparison Chart */}
        <ChartWrapper title="Sales Comparison (Current vs Previous Period)">
          <BarChart
            data={{
              labels: ['Previous Period', 'Current Period'],
              values: [
                analytics.dailySalesComparison.previous,
                analytics.dailySalesComparison.current
              ]
            }}
          />
        </ChartWrapper>
        
        {/* Gender Distribution Chart */}
        <ChartWrapper title="Sales by Gender">
          <PieChart
            data={{
              labels: Object.keys(analytics.peakSalesGender),
              values: Object.values(analytics.peakSalesGender)
            }}
          />
        </ChartWrapper>
        
        {/* Age Group Distribution Chart */}
        <ChartWrapper title="Sales by Age Group">
          <BarChart
            data={{
              labels: Object.keys(analytics.peakSalesAgeGroup),
              values: Object.values(analytics.peakSalesAgeGroup)
            }}
          />
        </ChartWrapper>
        
        {/* Exhibition Sales Chart */}
        {analytics.exhibitionSalesComparison.length > 0 && (
          <ChartWrapper title="Sales by Exhibition">
            <BarChart
              data={{
                labels: analytics.exhibitionSalesComparison.map(ex => ex.exhibitionId),
                values: analytics.exhibitionSalesComparison.map(ex => ex.count)
              }}
            />
          </ChartWrapper>
        )}
      </div>
    </div>
  );
};

export default EmployeeAnalytics;
