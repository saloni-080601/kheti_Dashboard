'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface FarmSummary {
  id: string;
  name: string;
  totalArea: number;
}

interface FarmContextType {
  selectedFarmId: string;
  setSelectedFarmId: (id: string) => void;
  farms: FarmSummary[];
  refreshFarms: () => Promise<void>;
  currentSeason: string;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const [selectedFarmId, setSelectedFarmId] = useState<string>('ALL');
  const [farms, setFarms] = useState<FarmSummary[]>([]);

  const fetchFarms = async () => {
    try {
      const res = await fetch('/api/farms');
      if (res.ok) {
        const data = await res.json();
        setFarms(data.map((f: any) => ({ id: f.id, name: f.name, totalArea: f.totalArea })));
      }
    } catch (err) {
      console.error('Failed to load farms in context:', err);
    }
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  // Determine current Indian agricultural season based on month
  const now = new Date();
  const month = now.getMonth(); // 0-11
  let currentSeason = 'Rabi 2026-27';
  if (month >= 5 && month <= 9) {
    currentSeason = `Kharif ${now.getFullYear()}`;
  } else if (month >= 2 && month <= 4) {
    currentSeason = `Zaid ${now.getFullYear()}`;
  } else {
    const startYr = month >= 9 ? now.getFullYear() : now.getFullYear() - 1;
    currentSeason = `Rabi ${startYr}-${(startYr + 1).toString().slice(-2)}`;
  }

  return (
    <FarmContext.Provider
      value={{
        selectedFarmId,
        setSelectedFarmId,
        farms,
        refreshFarms: fetchFarms,
        currentSeason,
      }}
    >
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  const context = useContext(FarmContext);
  if (!context) {
    throw new Error('useFarm must be used within a FarmProvider');
  }
  return context;
}
