import { Home, ShoppingCart, Users, Package, BarChart3, Megaphone, Bell, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { FEATURES } from '@/config/features';
const navigation = [{
  name: 'Dashboard',
  href: '/',
  icon: Home,
  enabled: FEATURES.DASHBOARD
}, {
  name: 'Orders',
  href: '/orders',
  icon: ShoppingCart,
  enabled: FEATURES.ORDERS
}, {
  name: 'Customers',
  href: '/customers',
  icon: Users,
  enabled: FEATURES.CUSTOMERS
}, {
  name: 'Products',
  href: '/products',
  icon: Package,
  enabled: true
}, {
  name: 'Reports',
  href: '/reports',
  icon: BarChart3,
  enabled: FEATURES.REPORTS
}];
const futureFeatures = [{
  name: 'Campaigns',
  href: '/campaigns',
  icon: Megaphone,
  enabled: FEATURES.CAMPAIGNS,
  badge: 'Phase 5'
}, {
  name: 'Alerts',
  href: '/alerts',
  icon: Bell,
  enabled: FEATURES.ALERTS,
  badge: 'Phase 4'
}, {
  name: 'Admin',
  href: '/admin/users',
  icon: Settings,
  enabled: FEATURES.USER_MANAGEMENT,
  badge: 'Phase 2'
}];
export function AppSidebar() {
  return <Sidebar>
      <SidebarContent className="bg-blue-300">
        <SidebarGroup>
          <SidebarGroupLabel>Packaging Products</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map(item => <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.href} className={({
                  isActive
                }) => isActive ? 'bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:opacity-90' : 'text-sidebar-foreground hover:bg-accent/10 hover:text-accent transition-colors'}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Coming Soon</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {futureFeatures.map(item => <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.href} className={({
                  isActive
                }) => isActive ? 'bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:opacity-90' : 'text-sidebar-foreground hover:bg-accent/10 hover:text-accent transition-colors'}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                      {item.badge && <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning font-medium">
                          {item.badge}
                        </span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>;
}