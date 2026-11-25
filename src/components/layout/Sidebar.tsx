'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MapPin,
  Sprout,
  CalendarCheck,
  Users,
  Tractor,
  Droplets,
  Package,
  CircleDollarSign,
  Receipt,
  TrendingUp,
  Bug,
  FlaskConical,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  {
    name: 'Dashboard',
    subtitle: 'Farm overview',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Farms & Fields (Khet)',
    subtitle: 'Farm and land details',
    href: '/farms',
    icon: MapPin,
  },
  {
    name: 'Crop Management',
    subtitle: 'Crop production and sales',
    href: '/crops',
    icon: Sprout,
  },
  {
    name: 'Fertilizer (Khad)',
    subtitle: 'Fertilizer stock and application',
    href: '/fertilizer',
    icon: FlaskConical,
  },
  {
    name: 'Farming Activities',
    subtitle: 'Tasks and field activities',
    href: '/activities',
    icon: CalendarCheck,
  },
  {
    name: 'Spray Log',
    subtitle: 'Crop-wise spray dates and products',
    href: '/sprays',
    icon: Bug,
  },
  {
    name: 'Labour & Wages',
    subtitle: 'Workers and wages',
    href: '/labour',
    icon: Users,
  },
  // {
  //   name: 'Machinery & Fuel',
  //   subtitle: 'Equipment and fuel',
  //   href: '/machinery',
  //   icon: Tractor,
  // },
  // {
  //   name: 'Irrigation & Water',
  //   subtitle: 'Watering and irrigation',
  //   href: '/irrigation',
  //   icon: Droplets,
  // },
  // {
  //   name: 'Harvest & Stock',
  //   subtitle: 'Harvest and inventory',
  //   href: '/inventory',
  //   icon: Package,
  // },
  // {
  //   name: 'Crop Sales & Mandi',
  //   subtitle: 'Crop sales and market records',
  //   href: '/sales',
  //   icon: CircleDollarSign,
  // },
  // {
  //   name: 'Expenses Tracker',
  //   subtitle: 'Farm cost tracking',
  //   href: '/expenses',
  //   icon: Receipt,
  // },
  {
    name: 'Profit & Loss (P&L)',
    subtitle: 'Profit and loss report',
    href: '/pnl',
    icon: TrendingUp,
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white text-stone-700 flex flex-col border-r border-blue-100 shadow-sm transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand in Sidebar */}
        <div className="p-5 border-b border-blue-100 bg-blue-50/70 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-black text-lg">
              🌾
            </div>
            <div>
              <h1 className="font-bold text-stone-900 text-base tracking-tight leading-none">
                Kheti Manager
              </h1>
              <p className="text-[11px] text-blue-700 mt-1 font-medium">
                Farm Management System
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden text-stone-500 hover:text-stone-900 p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 bg-white">
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-blue-700/70 uppercase">
            Farm Operations
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-sm font-semibold'
                    : 'text-stone-600 hover:bg-blue-50 hover:text-blue-900'
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-blue-600 group-hover:text-blue-700'
                  }`}
                />
                <div className="flex flex-col flex-1 leading-tight">
                  <span className="truncate">{item.name}</span>
                  <span
                    className={`text-[10px] ${
                      isActive ? 'text-blue-50' : 'text-stone-400 group-hover:text-blue-700'
                    }`}
                  >
                    {item.subtitle}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* User / Farm info footer */}
        <div className="p-4 border-t border-blue-100 bg-blue-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-white border border-blue-200 flex items-center justify-center text-xs text-blue-700 font-bold">
              KM
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-stone-800 truncate">
                Kisan Portal
              </p>
              <p className="text-[10px] text-blue-700 truncate">
                Live farm ledger
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
