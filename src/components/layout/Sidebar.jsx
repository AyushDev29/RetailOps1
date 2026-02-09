import React from 'react';
import { Link } from 'react-router-dom';

function Sidebar() {
  return (
    <aside className="sidebar">
      <nav>
        <Link to="/employee">Dashboard</Link>
        <Link to="/owner">Owner View</Link>
      </nav>
    </aside>
  );
}

export default Sidebar;
