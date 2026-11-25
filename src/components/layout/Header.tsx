'use client';

import React, { useState } from 'react';
import { useFarm } from '@/context/FarmContext';
import {
  Sprout,
  Calendar,
  Layers,
  PlusCircle,
  HelpCircle,
  Menu,
} from 'lucide-react';
import { Modal } from '../common/Modal';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const { selectedFarmId, setSelectedFarmId, farms, currentSeason } = useFarm();
  const [showUnitModal, setShowUnitModal] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-blue-100 px-4 sm:px-8 py-3 transition-all">
      <div className="flex items-center justify-between">
        {/* Left: Mobile Toggle & Brand/Farm Switcher */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-base sm:text-lg tracking-tight text-stone-900">
                  Kheti Manager
                </span>
                <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  खेती डैशबोर्ड
                </span>
              </div>
              <p className="text-[11px] text-stone-500 hidden sm:block">
                Complete Farm Management & Land Ledger
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-stone-200 hidden md:block mx-2" />

          {/* Farm Switcher Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-stone-500 hidden lg:inline-block">
              Active Farm:
            </span>
            <div className="relative">
              <select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                className="bg-stone-100 hover:bg-stone-200/80 text-stone-900 text-xs sm:text-sm font-semibold rounded-xl px-3 py-1.5 border border-stone-300/80 focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer transition-colors"
              >
                <option value="ALL">🌾 All Farms (Combined View)</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    🚜 {f.name} ({f.totalArea} Acres)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right: Season indicator, Unit guide, Help */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Season Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 bg-amber-50 border border-amber-200/80 text-amber-900 px-3 py-1 rounded-xl text-xs font-medium">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>Season: <strong>{currentSeason}</strong></span>
          </div>

          {/* Land Units Guide Modal Button */}
          <button
            onClick={() => setShowUnitModal(true)}
            className="flex items-center space-x-1 text-xs font-medium text-stone-600 hover:text-blue-700 bg-stone-100 hover:bg-stone-200/70 px-2.5 py-1.5 rounded-xl border border-stone-200 transition-colors"
            title="Land & Weight Unit Guide"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Units Guide</span>
          </button>
        </div>
      </div>

      {/* Unit Reference Modal */}
      <Modal
        isOpen={showUnitModal}
        onClose={() => setShowUnitModal(false)}
        title="Agricultural Measurement Units Guide"
        subtitle="Standard conversions used across Kheti Manager"
      >
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold text-stone-900 mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" /> Land Area Conversions
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <p className="font-bold text-stone-800">1 Acre (एकड़)</p>
                <p className="text-stone-600 mt-1">43,560 sq ft / 4,047 sq meters</p>
                <p className="text-stone-500 mt-0.5">= 40 Gunthas (Maharashtra/Karnataka)</p>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <p className="font-bold text-stone-800">Bigha (बीघा) Equivalence</p>
                <p className="text-stone-600 mt-1">~1.6 Bigha = 1 Acre (M.P. / Rajasthan)</p>
                <p className="text-stone-500 mt-0.5">~1.75 Bigha (UP standard)</p>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-3">
            <h4 className="font-semibold text-stone-900 mb-2 flex items-center gap-1.5">
              <Sprout className="w-4 h-4 text-blue-600" /> Harvest & Weight Units
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <p className="font-bold text-stone-800">1 Quintal (क्विंटल)</p>
                <p className="text-stone-600 mt-1">= 100 Kilograms (100 kg)</p>
                <p className="text-stone-500 mt-0.5">Standard Mandi market unit</p>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <p className="font-bold text-stone-800">1 Maund / Mann (मन)</p>
                <p className="text-stone-600 mt-1">= 40 Kilograms</p>
                <p className="text-stone-500 mt-0.5">2.5 Maund = 1 Quintal</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </header>
  );
}
