import React from 'react';
import { NavLink } from 'react-router-dom';
import type { AppNavItem } from '../../app/nav-items';
import { prefetchAuthenticatedRoute } from '../../app/route-prefetch';

type SidebarNavProps = {
  items: AppNavItem[];
  onNavigate?: () => void;
};

const SidebarNav: React.FC<SidebarNavProps> = ({ items, onNavigate }) => (
  <ul className="menu-list space-y-1">
    {items.map((item) => {
      const Icon = item.icon;
      return (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white/10 border border-white/10 shadow-sm text-white'
                  : 'text-white/80 hover:bg-white/5 hover:text-white'
              }`
            }
            onClick={onNavigate}
            onPointerEnter={() => prefetchAuthenticatedRoute(item.to)}
            onFocus={() => prefetchAuthenticatedRoute(item.to)}
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`h-5 w-5 shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-white/80 group-hover:text-white'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        </li>
      );
    })}
  </ul>
);

export default SidebarNav;
