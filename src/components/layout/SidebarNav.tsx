import React from 'react';
import { NavLink } from 'react-router-dom';
import type { AppNavItem } from '../../app/nav-items';
import { prefetchAuthenticatedRoute } from '../../app/route-prefetch';

type SidebarNavProps = {
  items: AppNavItem[];
  onNavigate?: () => void;
};

const SidebarNav: React.FC<SidebarNavProps> = ({ items, onNavigate }) => (
  <ul className="menu-list">
    {items.map((item) => (
      <li key={item.to}>
        <NavLink
          to={item.to}
          end={item.end}
          className={({ isActive }) => (isActive ? 'active' : undefined)}
          onClick={onNavigate}
          onPointerEnter={() => prefetchAuthenticatedRoute(item.to)}
          onFocus={() => prefetchAuthenticatedRoute(item.to)}
        >
          <span aria-hidden>{item.emoji}</span> {item.label}
        </NavLink>
      </li>
    ))}
  </ul>
);

export default SidebarNav;
