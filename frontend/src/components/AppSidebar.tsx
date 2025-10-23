import { Home, ShoppingCart, Users, Package, BarChart3 } from 'lucide-react';
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
export function AppSidebar() {
  return <Sidebar>
      <SidebarContent className="bg-slate-800 text-white border-r border-slate-700">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white font-bold text-lg px-4 py-3">Packaging Products</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map(item => <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.href} className={({
                  isActive
                }) => isActive ? 'bg-primary text-white font-semibold hover:bg-primary-hover' : 'text-slate-300 hover:bg-slate-700 hover:text-white transition-colors'}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>;
}