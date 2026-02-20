import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MaharashtraExhibitionMap.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Comprehensive coordinates for major Indian cities
const INDIA_LOCATIONS = {
  // Maharashtra
  'Mumbai': { lat: 19.0760, lng: 72.8777, state: 'Maharashtra' },
  'Pune': { lat: 18.5204, lng: 73.8567, state: 'Maharashtra' },
  'Nagpur': { lat: 21.1458, lng: 79.0882, state: 'Maharashtra' },
  'Nashik': { lat: 19.9975, lng: 73.7898, state: 'Maharashtra' },
  'Aurangabad': { lat: 19.8762, lng: 75.3433, state: 'Maharashtra' },
  'Thane': { lat: 19.2183, lng: 72.9781, state: 'Maharashtra' },
  'Dombivali': { lat: 19.2183, lng: 73.0868, state: 'Maharashtra' },
  'Kalyan': { lat: 19.2403, lng: 73.1305, state: 'Maharashtra' },
  'Solapur': { lat: 17.6599, lng: 75.9064, state: 'Maharashtra' },
  'Kolhapur': { lat: 16.7050, lng: 74.2433, state: 'Maharashtra' },
  
  // Delhi NCR
  'Delhi': { lat: 28.7041, lng: 77.1025, state: 'Delhi' },
  'New Delhi': { lat: 28.6139, lng: 77.2090, state: 'Delhi' },
  'Noida': { lat: 28.5355, lng: 77.3910, state: 'Uttar Pradesh' },
  'Gurgaon': { lat: 28.4595, lng: 77.0266, state: 'Haryana' },
  'Gurugram': { lat: 28.4595, lng: 77.0266, state: 'Haryana' },
  'Faridabad': { lat: 28.4089, lng: 77.3178, state: 'Haryana' },
  'Ghaziabad': { lat: 28.6692, lng: 77.4538, state: 'Uttar Pradesh' },
  
  // Karnataka
  'Bangalore': { lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
  'Bengaluru': { lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
  'Mysore': { lat: 12.2958, lng: 76.6394, state: 'Karnataka' },
  'Mangalore': { lat: 12.9141, lng: 74.8560, state: 'Karnataka' },
  
  // Tamil Nadu
  'Chennai': { lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu' },
  'Coimbatore': { lat: 11.0168, lng: 76.9558, state: 'Tamil Nadu' },
  'Madurai': { lat: 9.9252, lng: 78.1198, state: 'Tamil Nadu' },
  
  // Gujarat
  'Ahmedabad': { lat: 23.0225, lng: 72.5714, state: 'Gujarat' },
  'Surat': { lat: 21.1702, lng: 72.8311, state: 'Gujarat' },
  'Vadodara': { lat: 22.3072, lng: 73.1812, state: 'Gujarat' },
  'Rajkot': { lat: 22.3039, lng: 70.8022, state: 'Gujarat' },
  
  // Rajasthan
  'Jaipur': { lat: 26.9124, lng: 75.7873, state: 'Rajasthan' },
  'Jodhpur': { lat: 26.2389, lng: 73.0243, state: 'Rajasthan' },
  'Udaipur': { lat: 24.5854, lng: 73.7125, state: 'Rajasthan' },
  
  // West Bengal
  'Kolkata': { lat: 22.5726, lng: 88.3639, state: 'West Bengal' },
  'Howrah': { lat: 22.5958, lng: 88.2636, state: 'West Bengal' },
  
  // Telangana
  'Hyderabad': { lat: 17.3850, lng: 78.4867, state: 'Telangana' },
  
  // Andhra Pradesh
  'Visakhapatnam': { lat: 17.6868, lng: 83.2185, state: 'Andhra Pradesh' },
  'Vijayawada': { lat: 16.5062, lng: 80.6480, state: 'Andhra Pradesh' },
  
  // Kerala
  'Kochi': { lat: 9.9312, lng: 76.2673, state: 'Kerala' },
  'Thiruvananthapuram': { lat: 8.5241, lng: 76.9366, state: 'Kerala' },
  'Kozhikode': { lat: 11.2588, lng: 75.7804, state: 'Kerala' },
  
  // Punjab
  'Chandigarh': { lat: 30.7333, lng: 76.7794, state: 'Chandigarh' },
  'Ludhiana': { lat: 30.9010, lng: 75.8573, state: 'Punjab' },
  'Amritsar': { lat: 31.6340, lng: 74.8723, state: 'Punjab' },
  
  // Uttar Pradesh
  'Lucknow': { lat: 26.8467, lng: 80.9462, state: 'Uttar Pradesh' },
  'Kanpur': { lat: 26.4499, lng: 80.3319, state: 'Uttar Pradesh' },
  'Agra': { lat: 27.1767, lng: 78.0081, state: 'Uttar Pradesh' },
  'Varanasi': { lat: 25.3176, lng: 82.9739, state: 'Uttar Pradesh' },
  
  // Madhya Pradesh
  'Indore': { lat: 22.7196, lng: 75.8577, state: 'Madhya Pradesh' },
  'Bhopal': { lat: 23.2599, lng: 77.4126, state: 'Madhya Pradesh' },
  
  // Bihar
  'Patna': { lat: 25.5941, lng: 85.1376, state: 'Bihar' },
  
  // Odisha
  'Bhubaneswar': { lat: 20.2961, lng: 85.8245, state: 'Odisha' },
  
  // Assam
  'Guwahati': { lat: 26.1445, lng: 91.7362, state: 'Assam' }
};

// India center coordinates
const INDIA_CENTER = { lat: 22.5937, lng: 78.9629 };

// India geographical bounds (southwest and northeast corners)
const INDIA_BOUNDS = [
  [6.5, 68.0],  // Southwest corner (southernmost, westernmost)
  [35.5, 97.5]  // Northeast corner (northernmost, easternmost)
];

// Simplified GeoJSON for Maharashtra districts (approximate boundaries)
// In production, you would use actual GeoJSON data from a proper source
const MAHARASHTRA_DISTRICTS_GEOJSON = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "name": "Mumbai", "region": "Konkan" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [72.75, 18.90], [72.95, 18.90], [72.95, 19.30], [72.75, 19.30], [72.75, 18.90]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Thane", "region": "Konkan" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [72.95, 19.00], [73.30, 19.00], [73.30, 19.50], [72.95, 19.50], [72.95, 19.00]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Pune", "region": "Western" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [73.50, 18.30], [74.20, 18.30], [74.20, 19.00], [73.50, 19.00], [73.50, 18.30]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Nashik", "region": "Northern" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [73.40, 19.70], [74.30, 19.70], [74.30, 20.50], [73.40, 20.50], [73.40, 19.70]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Aurangabad", "region": "Marathwada" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [75.00, 19.50], [75.80, 19.50], [75.80, 20.20], [75.00, 20.20], [75.00, 19.50]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Nagpur", "region": "Vidarbha" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [78.80, 20.80], [79.50, 20.80], [79.50, 21.50], [78.80, 21.50], [78.80, 20.80]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Solapur", "region": "Western" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [75.50, 17.30], [76.20, 17.30], [76.20, 18.00], [75.50, 18.00], [75.50, 17.30]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Kolhapur", "region": "Western" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [74.00, 16.40], [74.60, 16.40], [74.60, 17.00], [74.00, 17.00], [74.00, 16.40]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Amravati", "region": "Vidarbha" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [77.40, 20.60], [78.20, 20.60], [78.20, 21.30], [77.40, 21.30], [77.40, 20.60]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Nanded", "region": "Marathwada" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [76.90, 18.80], [77.70, 18.80], [77.70, 19.50], [76.90, 19.50], [76.90, 18.80]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Sangli", "region": "Western" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [74.30, 16.60], [74.90, 16.60], [74.90, 17.20], [74.30, 17.20], [74.30, 16.60]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Jalgaon", "region": "Northern" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [75.20, 20.70], [76.00, 20.70], [76.00, 21.40], [75.20, 21.40], [75.20, 20.70]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Akola", "region": "Vidarbha" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [76.70, 20.40], [77.40, 20.40], [77.40, 21.00], [76.70, 21.00], [76.70, 20.40]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Latur", "region": "Marathwada" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [76.20, 18.10], [76.90, 18.10], [76.90, 18.70], [76.20, 18.70], [76.20, 18.10]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Dhule", "region": "Northern" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [74.40, 20.60], [75.10, 20.60], [75.10, 21.20], [74.40, 21.20], [74.40, 20.60]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Ahmednagar", "region": "Western" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [74.30, 18.80], [75.20, 18.80], [75.20, 19.60], [74.30, 19.60], [74.30, 18.80]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Chandrapur", "region": "Vidarbha" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [78.90, 19.60], [79.80, 19.60], [79.80, 20.30], [78.90, 20.30], [78.90, 19.60]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Parbhani", "region": "Marathwada" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [76.40, 18.90], [77.00, 18.90], [77.00, 19.50], [76.40, 19.50], [76.40, 18.90]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Jalna", "region": "Marathwada" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [75.50, 19.50], [76.20, 19.50], [76.20, 20.10], [75.50, 20.10], [75.50, 19.50]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Satara", "region": "Western" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [73.60, 17.40], [74.40, 17.40], [74.40, 18.10], [73.60, 18.10], [73.60, 17.40]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Ratnagiri", "region": "Konkan" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [73.00, 16.70], [73.60, 16.70], [73.60, 17.40], [73.00, 17.40], [73.00, 16.70]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Yavatmal", "region": "Vidarbha" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [77.80, 19.90], [78.60, 19.90], [78.60, 20.60], [77.80, 20.60], [77.80, 19.90]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Wardha", "region": "Vidarbha" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [78.30, 20.40], [79.00, 20.40], [79.00, 21.00], [78.30, 21.00], [78.30, 20.40]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Beed", "region": "Marathwada" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [75.40, 18.70], [76.10, 18.70], [76.10, 19.30], [75.40, 19.30], [75.40, 18.70]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Osmanabad", "region": "Marathwada" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [75.80, 17.90], [76.40, 17.90], [76.40, 18.50], [75.80, 18.50], [75.80, 17.90]
        ]]
      }
    }
  ]
};

const MaharashtraExhibitionMap = ({ exhibitions = [], orders = [] }) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [hoveredDistrict, setHoveredDistrict] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all'); // all, month, year, ongoing
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, completed

  // Filter exhibitions based on selected filters
  const filteredExhibitions = useMemo(() => {
    let filtered = [...exhibitions];
    const now = new Date();

    // Time filter
    if (timeFilter === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      filtered = filtered.filter(ex => {
        const createdAt = ex.createdAt?.toDate ? ex.createdAt.toDate() : new Date(ex.createdAt);
        return createdAt >= startOfMonth && createdAt <= endOfMonth;
      });
    } else if (timeFilter === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      filtered = filtered.filter(ex => {
        const createdAt = ex.createdAt?.toDate ? ex.createdAt.toDate() : new Date(ex.createdAt);
        return createdAt >= startOfYear && createdAt <= endOfYear;
      });
    } else if (timeFilter === 'ongoing') {
      filtered = filtered.filter(ex => ex.active === true);
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(ex => ex.active === true);
    } else if (statusFilter === 'completed') {
      filtered = filtered.filter(ex => ex.active === false);
    }

    return filtered;
  }, [exhibitions, timeFilter, statusFilter]);

  // Filter orders based on filtered exhibitions
  const filteredOrders = useMemo(() => {
    const exhibitionIds = new Set(filteredExhibitions.map(ex => ex.id));
    return orders.filter(order => exhibitionIds.has(order.exhibitionId));
  }, [orders, filteredExhibitions]);

  // Calculate sales data for each exhibition location - SHOW ALL EXHIBITIONS
  const exhibitionData = useMemo(() => {
    const dataMap = {};

    console.log('=== MAP DEBUG ===');
    console.log('Filtered Exhibitions:', filteredExhibitions);
    console.log('Filtered Orders:', filteredOrders);

    filteredExhibitions.forEach(exhibition => {
      let location = exhibition.location;
      
      console.log(`Processing exhibition at: "${location}"`);
      
      // Normalize location name to match our coordinates
      // Try exact match first, then fuzzy match
      let matchedLocation = location;
      if (!INDIA_LOCATIONS[location]) {
        // Try to find a match (case-insensitive, partial match)
        const availableLocations = Object.keys(INDIA_LOCATIONS);
        const exactMatch = availableLocations.find(loc => 
          loc.toLowerCase() === location.toLowerCase()
        );
        
        if (exactMatch) {
          matchedLocation = exactMatch;
          console.log(`✓ Exact match found: "${matchedLocation}"`);
        } else {
          const partialMatch = availableLocations.find(loc => 
            loc.toLowerCase().includes(location.toLowerCase()) || 
            location.toLowerCase().includes(loc.toLowerCase())
          );
          
          if (partialMatch) {
            matchedLocation = partialMatch;
            console.log(`✓ Partial match found: "${matchedLocation}" for "${location}"`);
          } else {
            console.warn(`⚠️ Location "${location}" not found. Available:`, availableLocations);
            // Still add it but without coordinates
            matchedLocation = location;
          }
        }
      }

      const exhibitionOrders = filteredOrders.filter(order => 
        order.exhibitionId === exhibition.id && 
        order.status === 'completed'
      );

      console.log(`Exhibition ${exhibition.id} at ${matchedLocation}: ${exhibitionOrders.length} orders`);

      const revenue = exhibitionOrders.reduce((sum, order) => {
        if (order.totals && order.totals.payableAmount) {
          return sum + order.totals.payableAmount;
        }
        return sum + (order.price * order.quantity || 0);
      }, 0);

      const itemsSold = exhibitionOrders.reduce((sum, order) => {
        if (order.items && Array.isArray(order.items)) {
          return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
        }
        return sum + (order.quantity || 0);
      }, 0);

      if (!dataMap[matchedLocation]) {
        dataMap[matchedLocation] = {
          location: matchedLocation,
          originalLocation: location,
          coordinates: INDIA_LOCATIONS[matchedLocation] || null,
          exhibitions: [],
          totalRevenue: 0,
          totalOrders: 0,
          totalItems: 0,
          active: false,
          activeCount: 0,
          completedCount: 0
        };
      }

      dataMap[matchedLocation].exhibitions.push({
        ...exhibition,
        revenue,
        orders: exhibitionOrders.length,
        items: itemsSold
      });
      dataMap[matchedLocation].totalRevenue += revenue;
      dataMap[matchedLocation].totalOrders += exhibitionOrders.length;
      dataMap[matchedLocation].totalItems += itemsSold;
      if (exhibition.active) {
        dataMap[matchedLocation].active = true;
        dataMap[matchedLocation].activeCount += 1;
      } else {
        dataMap[matchedLocation].completedCount += 1;
      }
    });

    // Convert to array and sort by revenue (but keep zero-revenue exhibitions)
    const dataArray = Object.values(dataMap).sort((a, b) => {
      // Sort by revenue, but if both are 0, sort by exhibition count
      if (b.totalRevenue !== a.totalRevenue) {
        return b.totalRevenue - a.totalRevenue;
      }
      return b.exhibitions.length - a.exhibitions.length;
    });
    
    // Add rank
    dataArray.forEach((item, index) => {
      item.rank = index + 1;
    });

    console.log('Final exhibition data:', dataArray);
    console.log('=== END DEBUG ===');

    return dataArray;
  }, [filteredExhibitions, filteredOrders]);

  // Get color based on revenue (gradient from low to high)
  // Special handling: if there are exhibitions but no revenue, show in purple
  const getColorForRevenue = (revenue, maxRevenue, hasExhibitions) => {
    if (hasExhibitions && revenue === 0) {
      return '#8b5cf6'; // Purple for exhibitions with no sales yet
    }
    if (maxRevenue === 0) return '#e5e7eb';
    const intensity = revenue / maxRevenue;
    
    if (intensity > 0.7) return '#dc2626'; // High - Red
    if (intensity > 0.4) return '#f59e0b'; // Medium - Orange
    if (intensity > 0.2) return '#3b82f6'; // Low-Medium - Blue
    return '#10b981'; // Low - Green
  };

  const maxRevenue = Math.max(...exhibitionData.map(d => d.totalRevenue), 1);

  return (
    <div className="maharashtra-map-container">
      <div className="map-header">
        <h3>India Exhibition Sales Map</h3>
        <p className="map-subtitle">Interactive visualization of exhibition performance across India</p>
      </div>

      {/* Filters */}
      <div className="map-filters">
        <div className="filter-group">
          <label>Time Period</label>
          <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="filter-select">
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="ongoing">Ongoing Only</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
            <option value="all">All Exhibitions</option>
            <option value="active">Active Only</option>
            <option value="completed">Completed Only</option>
          </select>
        </div>
        <div className="filter-summary">
          <span className="summary-badge">
            {filteredExhibitions.length} Exhibition{filteredExhibitions.length !== 1 ? 's' : ''}
          </span>
          <span className="summary-badge">
            ₹{exhibitionData.reduce((sum, d) => sum + d.totalRevenue, 0).toLocaleString('en-IN')} Revenue
          </span>
          <span className="summary-badge">
            {exhibitionData.reduce((sum, d) => sum + d.totalOrders, 0)} Orders
          </span>
        </div>
      </div>

      <div className="map-content">
        {/* Real Map with City Highlights */}
        <div className="map-leaflet-container">
          <MapContainer
            center={[INDIA_CENTER.lat, INDIA_CENTER.lng]}
            zoom={5}
            minZoom={4}
            maxZoom={12}
            maxBounds={INDIA_BOUNDS}
            maxBoundsViscosity={0.5}
            style={{ height: '600px', width: '100%', borderRadius: '12px' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* City Area Highlights with Hover */}
            {exhibitionData.map((data) => {
              if (!data.coordinates) return null;
              
              const color = getColorForRevenue(data.totalRevenue, maxRevenue, data.exhibitions.length > 0);
              const isHovered = hoveredDistrict === data.location;
              const isSelected = selectedLocation === data.location;
              
              return (
                <React.Fragment key={data.location}>
                  {/* Large circle for area highlight */}
                  <CircleMarker
                    center={[data.coordinates.lat, data.coordinates.lng]}
                    radius={isHovered || isSelected ? 35 : 25}
                    fillColor={color}
                    color={color}
                    weight={isSelected ? 3 : 2}
                    opacity={0.6}
                    fillOpacity={isHovered || isSelected ? 0.4 : 0.25}
                    eventHandlers={{
                      mouseover: () => setHoveredDistrict(data.location),
                      mouseout: () => setHoveredDistrict(null),
                      click: () => setSelectedLocation(data.location === selectedLocation ? null : data.location)
                    }}
                  />
                  
                  {/* Center marker */}
                  <CircleMarker
                    center={[data.coordinates.lat, data.coordinates.lng]}
                    radius={data.active ? 10 : 7}
                    fillColor="#fff"
                    color={color}
                    weight={3}
                    opacity={1}
                    fillOpacity={1}
                    eventHandlers={{
                      mouseover: () => setHoveredDistrict(data.location),
                      mouseout: () => setHoveredDistrict(null),
                      click: () => setSelectedLocation(data.location === selectedLocation ? null : data.location)
                    }}
                  >
                    <Popup>
                      <div className="map-popup">
                        <div className="popup-header">
                          <span className="popup-rank">#{data.rank}</span>
                          <h4>{data.location}</h4>
                          {data.active && <span className="popup-badge active">Active</span>}
                        </div>
                        <div className="popup-stats">
                          <div className="popup-stat">
                            <span className="stat-label">Revenue</span>
                            <span className="stat-value">₹{data.totalRevenue.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="popup-stat">
                            <span className="stat-label">Orders</span>
                            <span className="stat-value">{data.totalOrders}</span>
                          </div>
                          <div className="popup-stat">
                            <span className="stat-label">Items Sold</span>
                            <span className="stat-value">{data.totalItems}</span>
                          </div>
                          <div className="popup-stat">
                            <span className="stat-label">Exhibitions</span>
                            <span className="stat-value">{data.exhibitions.length}</span>
                          </div>
                        </div>
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '12px', fontSize: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ color: '#10b981', fontWeight: 600 }}>{data.activeCount} Active</span>
                          </div>
                          <div style={{ flex: 1, textAlign: 'right' }}>
                            <span style={{ color: '#6b7280', fontWeight: 600 }}>{data.completedCount} Completed</span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>

        {/* Legend */}
        <div className="map-legend">
          <h4>Sales Performance</h4>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#dc2626' }}></div>
              <span>High (70%+)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#f59e0b' }}></div>
              <span>Medium (40-70%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#3b82f6' }}></div>
              <span>Low-Med (20-40%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#10b981' }}></div>
              <span>Low (&lt;20%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#8b5cf6' }}></div>
              <span>No Sales Yet</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#f3f4f6', border: '1px solid #9ca3af' }}></div>
              <span>No Exhibition</span>
            </div>
          </div>
          <div className="legend-note">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
            </svg>
            <span>Click districts to view details</span>
          </div>
        </div>

        {/* Rankings Table */}
        <div className="map-rankings">
          <h4>Exhibition Rankings</h4>
          <div className="rankings-list">
            {exhibitionData.slice(0, 10).map((data) => (
              <div
                key={data.location}
                className={`ranking-item ${selectedLocation === data.location ? 'selected' : ''}`}
                onClick={() => setSelectedLocation(data.location === selectedLocation ? null : data.location)}
                onMouseEnter={() => setHoveredDistrict(data.location)}
                onMouseLeave={() => setHoveredDistrict(null)}
              >
                <div className="ranking-position">
                  <span className="rank-number">#{data.rank}</span>
                  {data.active && <span className="status-dot active"></span>}
                </div>
                <div className="ranking-info">
                  <div className="ranking-location">{data.location}</div>
                  <div className="ranking-stats">
                    <span>₹{(data.totalRevenue / 1000).toFixed(1)}k</span>
                    <span>•</span>
                    <span>{data.totalOrders} orders</span>
                    <span>•</span>
                    <span>{data.exhibitions.length} exhibitions</span>
                  </div>
                </div>
                <div className="ranking-bar">
                  <div
                    className="ranking-bar-fill"
                    style={{
                      width: data.totalRevenue > 0 ? `${(data.totalRevenue / maxRevenue) * 100}%` : '5%',
                      background: getColorForRevenue(data.totalRevenue, maxRevenue, data.exhibitions.length > 0)
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {exhibitionData.length === 0 && (
        <div className="map-empty">
          <h4>No Exhibition Data</h4>
          <p>Start creating exhibitions to see them on the map</p>
        </div>
      )}
    </div>
  );
};

export default MaharashtraExhibitionMap;
