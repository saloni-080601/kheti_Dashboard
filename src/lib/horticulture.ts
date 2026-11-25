import { addDays, format, differenceInDays } from 'date-fns';

export interface StageDefinition {
  stageNumber: number;
  stageKey: string;
  stageName: string;
  hindiName: string;
  description: string;
  defaultOffsetDays: number; // Relative to planting date (0 = planting date)
  defaultLabourRoles: string[];
  defaultMaterials: string[];
}

export const HORTICULTURE_STAGES: StageDefinition[] = [
  {
    stageNumber: 1,
    stageKey: 'FIELD_PREP',
    stageName: 'Field Preparation',
    hindiName: 'जुताई व कल्टीवेशन',
    description: 'Cultivation, deep ploughing, rotavator, soil leveling & harrowing',
    defaultOffsetDays: -10,
    defaultLabourRoles: ['Tractor Driver', 'Field Labour'],
    defaultMaterials: ['Diesel', 'Tractor Rental / Maintenance'],
  },
  {
    stageNumber: 2,
    stageKey: 'BED_PREP',
    stageName: 'Bed Preparation',
    hindiName: 'बेड निर्माण',
    description: 'Raised bed making (width, height, furrow spacing) by bed-maker or labour',
    defaultOffsetDays: -6,
    defaultLabourRoles: ['Bed Preparation Labour'],
    defaultMaterials: ['Bed Former / Tractor Hire'],
  },
  {
    stageNumber: 3,
    stageKey: 'BASAL_DOSE',
    stageName: 'Basal Dose Application',
    hindiName: 'बेसल डोज़ (आधार खाद)',
    description: 'FYM (Gobar khaad), SSP, DAP, MOP, Neem Cake, micronutrients mix',
    defaultOffsetDays: -4,
    defaultLabourRoles: ['Khaad Spreading Labour'],
    defaultMaterials: ['DAP / SSP', 'MOP (Potash)', 'Gobar Khaad (FYM)', 'Neem Khali', 'Micronutrients'],
  },
  {
    stageNumber: 4,
    stageKey: 'DRIP_SETUP',
    stageName: 'Drip Line Setup',
    hindiName: 'ड्रिप लाइन बिछाना व टेस्टिंग',
    description: 'Inline/online lateral pipe laying, sub-main connection, pressure test & flush',
    defaultOffsetDays: -3,
    defaultLabourRoles: ['Drip Installation Labour'],
    defaultMaterials: ['16mm Lateral Pipe', 'Joiners / End Caps', 'Drip Drippers / Connectors'],
  },
  {
    stageNumber: 5,
    stageKey: 'MULCHING',
    stageName: 'Mulching Film & Punching',
    hindiName: 'मल्चिंग पेपर व होल पंचिंग',
    description: 'Silver-black mulch roll laying (21/25/30 micron), soil pegging & hole punching',
    defaultOffsetDays: -1,
    defaultLabourRoles: ['Mulching Laying Labour', 'Hole Punching Labour'],
    defaultMaterials: ['Mulch Film Rolls (Silver-Black)', 'Mulch Pegs / Staples'],
  },
  {
    stageNumber: 6,
    stageKey: 'PLANTING',
    stageName: 'Planting / Sowing',
    hindiName: 'रोपाई / बुवाई (Transplanting/Sowing)',
    description: 'Nursery sapling transplanting or direct seed sowing with initial drenching',
    defaultOffsetDays: 0,
    defaultLabourRoles: ['Transplanting Women/Men Labour'],
    defaultMaterials: ['Nursery Saplings (पौध)', 'Hybrid Seed Packets', 'Humic Acid / Fungicide Drenching'],
  },
  {
    stageNumber: 7,
    stageKey: 'CROP_CARE',
    stageName: 'Crop Care & Fertigation',
    hindiName: 'फसल सुरक्षा, फर्टिगेशन व स्प्रे',
    description: 'Water-soluble fertilizer fertigation, trellising/staking, insecticide/fungicide spray',
    defaultOffsetDays: 7,
    defaultLabourRoles: ['Spraying Labour', 'Staking / Wire Trellising Labour', 'Weeding Labour'],
    defaultMaterials: ['19:19:19 (NPK)', '12:61:00', '0:52:34', 'Calcium Nitrate + Boron', 'Agrochemicals'],
  },
  {
    stageNumber: 8,
    stageKey: 'HARVESTING',
    stageName: 'Harvesting & Picking',
    hindiName: 'तुड़ाई व पिकिंग (Daily/Weekly)',
    description: 'Regular fruit plucking, grading (Grade A / B), sorting, crating and weighing',
    defaultOffsetDays: 35, // Default for kheera (auto-recalibrated for tomato/chilli)
    defaultLabourRoles: ['Fruit Plucking Labour', 'Sorting / Crating Labour'],
    defaultMaterials: ['Harvesting Crates / Bags', 'Weighing Scale'],
  },
  {
    stageNumber: 9,
    stageKey: 'MANDI_SALE',
    stageName: 'Mandi Sale & Recovery',
    hindiName: 'मंडी बिक्री व पेमेंट वसूली',
    description: 'Transport to Mandi, auction slip entry, deductions (commission, freight) & payout',
    defaultOffsetDays: 36,
    defaultLabourRoles: ['Loading / Unloading (Hamali)'],
    defaultMaterials: ['Transport Pickup / Vehicle Hire', 'Mandi Aadhat Commission', 'Crates Toll'],
  },
];

export interface CropTemplate {
  name: string;
  hindiName: string;
  category: string;
  season: 'KHARIF' | 'RABI' | 'ZAID' | 'PERENNIAL';
  defaultEstDaysToHarvest: number; // e.g. 35 for kheera, 70 for tomato
  harvestRangeText: string;
  pickingFrequencyDays: number; // e.g. 2 days for kheera, 5 days for tomato
  expectedHarvestDurationDays: number;
  expectedYieldPerAcreKg: number;
  recommendedSpacing: string;
  stageOffsets: Record<number, number>; // stageNumber -> offsetDays from planting
}

export const CROP_TEMPLATES: Record<string, CropTemplate> = {
  'Cucumber (खीरा)': {
    name: 'Cucumber (खीरा)',
    hindiName: 'खीरा (Cucumber)',
    category: 'VEGETABLE',
    season: 'ZAID',
    defaultEstDaysToHarvest: 35,
    harvestRangeText: '32 – 40 din',
    pickingFrequencyDays: 2,
    expectedHarvestDurationDays: 45,
    expectedYieldPerAcreKg: 20000,
    recommendedSpacing: 'Bed: 4-5 ft, Plant: 1.5 ft',
    stageOffsets: {
      1: -10, // Field prep
      2: -6,  // Bed prep
      3: -4,  // Basal dose
      4: -3,  // Drip setup
      5: -1,  // Mulching
      6: 0,   // Planting
      7: 7,   // Crop care
      8: 35,  // 1st Harvest
      9: 36,  // Mandi sale
    },
  },
  'Tomato (टमाटर)': {
    name: 'Tomato (टमाटर)',
    hindiName: 'टमाटर (Tomato)',
    category: 'VEGETABLE',
    season: 'RABI',
    defaultEstDaysToHarvest: 70,
    harvestRangeText: '65 – 75 din',
    pickingFrequencyDays: 4,
    expectedHarvestDurationDays: 75,
    expectedYieldPerAcreKg: 35000,
    recommendedSpacing: 'Bed: 4-5 ft, Plant: 1.5-2 ft (Staking required)',
    stageOffsets: {
      1: -12,
      2: -8,
      3: -5,
      4: -4,
      5: -2,
      6: 0,
      7: 10,
      8: 70,
      9: 71,
    },
  },
  'Chilli (हरी मिर्च)': {
    name: 'Chilli (हरी मिर्च)',
    hindiName: 'हरी मिर्च (Chilli)',
    category: 'VEGETABLE',
    season: 'KHARIF',
    defaultEstDaysToHarvest: 70,
    harvestRangeText: '65 – 75 din',
    pickingFrequencyDays: 7,
    expectedHarvestDurationDays: 100,
    expectedYieldPerAcreKg: 10000,
    recommendedSpacing: 'Bed: 4 ft, Plant: 1.5 ft',
    stageOffsets: {
      1: -12,
      2: -7,
      3: -5,
      4: -3,
      5: -2,
      6: 0,
      7: 12,
      8: 70,
      9: 72,
    },
  },
  'Capsicum / Shimla Mirch (शिमला मिर्च)': {
    name: 'Capsicum / Shimla Mirch (शिमला मिर्च)',
    hindiName: 'शिमला मिर्च (Capsicum)',
    category: 'VEGETABLE',
    season: 'RABI',
    defaultEstDaysToHarvest: 68,
    harvestRangeText: '65 – 75 din',
    pickingFrequencyDays: 5,
    expectedHarvestDurationDays: 70,
    expectedYieldPerAcreKg: 18000,
    recommendedSpacing: 'Bed: 4 ft, Plant: 1.25 ft',
    stageOffsets: {
      1: -12,
      2: -8,
      3: -5,
      4: -4,
      5: -2,
      6: 0,
      7: 10,
      8: 68,
      9: 69,
    },
  },
  'Bitter Gourd (करेला)': {
    name: 'Bitter Gourd (करेला)',
    hindiName: 'करेला (Bitter Gourd)',
    category: 'VEGETABLE',
    season: 'ZAID',
    defaultEstDaysToHarvest: 52,
    harvestRangeText: '50 – 55 din',
    pickingFrequencyDays: 3,
    expectedHarvestDurationDays: 60,
    expectedYieldPerAcreKg: 12000,
    recommendedSpacing: 'Bed: 6 ft, Plant: 2 ft (Mandap/Trellis)',
    stageOffsets: {
      1: -10,
      2: -6,
      3: -4,
      4: -3,
      5: -1,
      6: 0,
      7: 8,
      8: 52,
      9: 53,
    },
  },
  'Bottle Gourd (लौकी)': {
    name: 'Bottle Gourd (लौकी)',
    hindiName: 'लौकी (Bottle Gourd)',
    category: 'VEGETABLE',
    season: 'ZAID',
    defaultEstDaysToHarvest: 48,
    harvestRangeText: '45 – 55 din',
    pickingFrequencyDays: 3,
    expectedHarvestDurationDays: 60,
    expectedYieldPerAcreKg: 22000,
    recommendedSpacing: 'Bed: 6-8 ft, Plant: 2.5 ft',
    stageOffsets: {
      1: -10,
      2: -6,
      3: -4,
      4: -3,
      5: -1,
      6: 0,
      7: 8,
      8: 48,
      9: 49,
    },
  },
};

/**
 * Calculates dynamic dates for all 9 stages based on planting date,
 * editable days to first harvest, and any logged actual dates.
 */
export function calculateDynamicStageDates({
  sowingDate,
  cropName,
  estDaysToHarvest,
  actualPlantingDate,
  actualFirstHarvestDate,
  existingStages = [],
}: {
  sowingDate: Date | string;
  cropName: string;
  estDaysToHarvest?: number;
  actualPlantingDate?: Date | string | null;
  actualFirstHarvestDate?: Date | string | null;
  existingStages?: Array<{
    stageNumber: number;
    estDaysOffset?: number;
    actualDate?: Date | string | null;
  }>;
}) {
  const template = CROP_TEMPLATES[cropName];
  const targetDaysToHarvest =
    estDaysToHarvest || template?.defaultEstDaysToHarvest || 35;

  const basePlantingDate = actualPlantingDate
    ? new Date(actualPlantingDate)
    : new Date(sowingDate);

  return HORTICULTURE_STAGES.map((def) => {
    const existing = existingStages.find((s) => s.stageNumber === def.stageNumber);

    // Default offset
    let offsetDays = template?.stageOffsets[def.stageNumber] ?? def.defaultOffsetDays;
    if (existing?.estDaysOffset !== undefined) {
      offsetDays = existing.estDaysOffset;
    }

    // Adjust Stage 8 (Harvesting) & 9 (Mandi Sale) to targetDaysToHarvest
    if (def.stageNumber === 8) {
      offsetDays = targetDaysToHarvest;
    } else if (def.stageNumber === 9) {
      offsetDays = targetDaysToHarvest + 1;
    }

    // Expected Date based on base planting date + offset
    let expectedDate = addDays(basePlantingDate, offsetDays);

    // If actual 1st harvest is logged and we are at stage 8 or 9, calibrate with actual date
    let actualDate = existing?.actualDate ? new Date(existing.actualDate) : null;
    if (def.stageNumber === 6 && actualPlantingDate) {
      actualDate = new Date(actualPlantingDate);
    }
    if (def.stageNumber === 8 && actualFirstHarvestDate) {
      actualDate = new Date(actualFirstHarvestDate);
    }

    return {
      stageNumber: def.stageNumber,
      stageKey: def.stageKey,
      stageName: def.stageName,
      hindiName: def.hindiName,
      estDaysOffset: offsetDays,
      expectedDate,
      actualDate,
    };
  });
}

/**
 * Generates smart alerts & reminders for a crop based on current stage and calendar
 */
export function generateCropReminders({
  cropId,
  farmId,
  cropName,
  plantingDate,
  currentStageNumber,
  estDaysToHarvest = 35,
  actualFirstHarvestDate,
}: {
  cropId: string;
  farmId?: string;
  cropName: string;
  plantingDate: Date;
  currentStageNumber: number;
  estDaysToHarvest?: number;
  actualFirstHarvestDate?: Date | null;
}) {
  const reminders = [];
  const baseDate = new Date(plantingDate);

  // 1. Drip Line Check
  reminders.push({
    title: `${cropName}: Drip line pressure & emitter flushing check`,
    category: 'DRIP_CHECK',
    stageNumber: 4,
    priority: 'HIGH',
    dueDate: addDays(baseDate, -2),
    notes: 'Verify discharge rate (LPH), fix any end-cap leaks before laying mulch.',
  });

  // 2. Initial Fertigation (Humic + 19:19:19)
  reminders.push({
    title: `${cropName}: Early vegetative fertigation (19:19:19 + Humic)`,
    category: 'FERTIGATION',
    stageNumber: 7,
    priority: 'MEDIUM',
    dueDate: addDays(baseDate, 7),
    notes: 'Apply root booster drenching or drip fertigation for fast establishment.',
  });

  // 3. Flower & Branching Spray
  const midCareDays = Math.max(15, Math.floor(estDaysToHarvest * 0.5));
  reminders.push({
    title: `${cropName}: Flowering booster spray (0:52:34 + Micronutrients)`,
    category: 'SPRAY',
    stageNumber: 7,
    priority: 'HIGH',
    dueDate: addDays(baseDate, midCareDays),
    notes: 'Prevent flower drop and enhance fruit set.',
  });

  // 4. Labour Booking Alert (2-3 days before expected harvest)
  const harvestAlertDays = Math.max(2, estDaysToHarvest - 3);
  const firstHarvestDate = actualFirstHarvestDate
    ? new Date(actualFirstHarvestDate)
    : addDays(baseDate, estDaysToHarvest);

  reminders.push({
    title: `${cropName}: Advance labour booking for 1st Harvest / Picking`,
    category: 'LABOUR_BOOKING',
    stageNumber: 8,
    priority: 'URGENT',
    dueDate: addDays(baseDate, harvestAlertDays),
    notes: `1st harvest starts around ${format(firstHarvestDate, 'dd MMM yyyy')}. Arrange crates and harvesting workers in advance.`,
  });

  // 5. Harvest Window Alert
  reminders.push({
    title: `${cropName}: 1st Commercial Picking Window Opens (${estDaysToHarvest} Days)`,
    category: 'HARVEST_WINDOW',
    stageNumber: 8,
    priority: 'HIGH',
    dueDate: firstHarvestDate,
    notes: 'Harvest tender, uniform size fruits early morning to get best Mandi price.',
  });

  return reminders.map((r) => ({
    ...r,
    cropId,
    farmId,
  }));
}
