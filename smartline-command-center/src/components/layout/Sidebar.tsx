import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Car,
  MapPin,
  Users,
  Wallet,
  Ticket,
  HeadphonesIcon,
  Settings,
  LogOut,
  UserPlus,
  ChevronLeft,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Driver Requests', href: '/driver-requests', icon: UserPlus },
  { name: 'Safety & SOS', href: '/safety', icon: ShieldAlert },
  { name: 'Drivers', href: '/drivers', icon: Car },
  { name: 'Trips', href: '/trips', icon: MapPin },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Wallet & Payments', href: '/wallet', icon: Wallet },
  { name: 'Promo Codes', href: '/promos', icon: Ticket },
  { name: 'Support', href: '/support', icon: HeadphonesIcon },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className={cn(
          'flex h-16 items-center border-b border-sidebar-border px-4',
          collapsed ? 'justify-center' : 'justify-between'
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">SL</span>
              </div>
              <span className="font-semibold text-sidebar-foreground">SmartLine</span>
            </div>
          )}
          {collapsed && (
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SL</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                  collapsed && 'justify-center px-2'
                )}
              >
                <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse Button & Logout */}
        <div className="border-t border-sidebar-border p-2 space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              collapsed ? 'justify-center' : 'justify-start gap-3'
            )}
          >
            <ChevronLeft className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')} />
            {!collapsed && <span>Collapse</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'w-full text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive',
              collapsed ? 'justify-center' : 'justify-start gap-3'
            )}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Logout</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
}
