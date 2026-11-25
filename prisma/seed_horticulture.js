const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Horticulture Crops for Mayur Farm...');

  const farm = await prisma.farm.findFirst();
  if (!farm) {
    console.log('No farm found. Please create a farm first.');
    return;
  }

  // 1. Create or ensure fields exist for Kheera (4 Acre) and Tomato (2 Acre)
  let kheeraField = await prisma.field.findFirst({
    where: { farmId: farm.id, name: { contains: 'Kheera' } },
  });

  if (!kheeraField) {
    kheeraField = await prisma.field.create({
      data: {
        farmId: farm.id,
        name: 'Plot 1 - Kheera (4 Acre)',
        area: 4.0,
        soilType: 'Black Cotton Soil',
        irrigationSource: 'Drip & Borewell',
        status: 'ACTIVE',
        notes: 'Raised beds with inline drip and 25 micron silver-black mulch',
      },
    });
    console.log('Created Kheera Field (4 Acres):', kheeraField.id);
  }

  let tomatoField = await prisma.field.findFirst({
    where: { farmId: farm.id, name: { contains: 'Tamatar' } },
  });

  if (!tomatoField) {
    tomatoField = await prisma.field.create({
      data: {
        farmId: farm.id,
        name: 'Plot 2 - Tamatar (2 Acre)',
        area: 2.0,
        soilType: 'Black Cotton Soil',
        irrigationSource: 'Drip & Borewell',
        status: 'ACTIVE',
        notes: 'Raised beds with wire staking, inline drip and 25 micron mulch',
      },
    });
    console.log('Created Tomato Field (2 Acres):', tomatoField.id);
  }

  // 2. Setup Cucumber (खीरा) - 4 Acre
  // Suppose sown 36 days ago, so it is in Stage 8: HARVESTING
  const now = new Date();
  const kheeraSowingDate = new Date(now.getTime() - 36 * 24 * 60 * 60 * 1000);
  const kheeraFirstHarvest = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 1st harvest 2 days ago (Day 34)

  let kheeraCrop = await prisma.crop.findFirst({
    where: { fieldId: kheeraField.id, name: { contains: 'Cucumber' } },
  });

  if (!kheeraCrop) {
    kheeraCrop = await prisma.crop.create({
      data: {
        farmId: farm.id,
        fieldId: kheeraField.id,
        name: 'Cucumber (खीरा)',
        variety: 'VNR Crisp / Malini',
        season: 'ZAID',
        area: 4.0,
        sowingDate: kheeraSowingDate,
        expectedHarvestDate: new Date(kheeraSowingDate.getTime() + 35 * 24 * 60 * 60 * 1000),
        expectedFirstHarvest: new Date(kheeraSowingDate.getTime() + 35 * 24 * 60 * 60 * 1000),
        actualFirstHarvest: kheeraFirstHarvest,
        estDaysToHarvest: 35,
        targetYield: 80000, // 80,000 kg (20,000 kg/acre)
        actualYield: 1850,
        currentStageNumber: 8,
        currentStageName: 'Harvesting & Picking',
        status: 'HARVESTING',
        notes: 'High yield hybrid cucumber on mulched beds. Continuous picking every 2 days.',
      },
    });
    console.log('Created Cucumber Crop (4 Acres):', kheeraCrop.id);

    // Create 9 stages for Cucumber
    const stageDefs = [
      { num: 1, key: 'FIELD_PREP', name: 'Field Preparation', hindi: 'जुताई व कल्टीवेशन', offset: -10, status: 'COMPLETED', lCost: 4800, mCost: 3500 },
      { num: 2, key: 'BED_PREP', name: 'Bed Preparation', hindi: 'बेड निर्माण', offset: -6, status: 'COMPLETED', lCost: 3600, mCost: 2000 },
      { num: 3, key: 'BASAL_DOSE', name: 'Basal Dose Application', hindi: 'बेसल डोज़ (आधार खाद)', offset: -4, status: 'COMPLETED', lCost: 2400, mCost: 14500, mat: '4 Trolley Gobar, 4 Bag DAP, 2 Bag Potash' },
      { num: 4, key: 'DRIP_SETUP', name: 'Drip Line Setup', hindi: 'ड्रिप लाइन बिछाना व टेस्टिंग', offset: -3, status: 'COMPLETED', lCost: 2000, mCost: 8500, mat: '16mm inline lateral, flush valves' },
      { num: 5, key: 'MULCHING', name: 'Mulching Film & Punching', hindi: 'मल्चिंग पेपर व होल पंचिंग', offset: -1, status: 'COMPLETED', lCost: 4000, mCost: 16000, mat: '8 rolls 25 micron silver-black mulch' },
      { num: 6, key: 'PLANTING', name: 'Planting / Sowing', hindi: 'रोपाई / बुवाई (Planting)', offset: 0, status: 'COMPLETED', lCost: 4800, mCost: 12000, mat: 'Hybrid Seed packets (Malini) & Humic Drenching' },
      { num: 7, key: 'CROP_CARE', name: 'Crop Care & Fertigation', hindi: 'फसल सुरक्षा, फर्टिगेशन व स्प्रे', offset: 7, status: 'COMPLETED', lCost: 5200, mCost: 8800, mat: '19:19:19, 12:61:00, Calcium-Boron Spray' },
      { num: 8, key: 'HARVESTING', name: 'Harvesting & Picking', hindi: 'तुड़ाई व पिकिंग (Daily/Weekly)', offset: 35, status: 'IN_PROGRESS', lCost: 3200, mCost: 1200, mat: '40 Harvesting crates' },
      { num: 9, key: 'MANDI_SALE', name: 'Mandi Sale & Recovery', hindi: 'मंडी बिक्री व पेमेंट वसूली', offset: 36, status: 'IN_PROGRESS', lCost: 1200, mCost: 2200 },
    ];

    for (const s of stageDefs) {
      const expDate = new Date(kheeraSowingDate.getTime() + s.offset * 24 * 60 * 60 * 1000);
      await prisma.cropStage.create({
        data: {
          cropId: kheeraCrop.id,
          stageNumber: s.num,
          stageKey: s.key,
          stageName: s.name,
          hindiName: s.hindi,
          estDaysOffset: s.offset,
          expectedDate: expDate,
          actualDate: expDate,
          status: s.status,
          labourCost: s.lCost || 0,
          materialCost: s.mCost || 0,
          totalCost: (s.lCost || 0) + (s.mCost || 0),
          materialItems: s.mat || '',
        },
      });

      // Also log expense for realism
      if ((s.lCost || 0) + (s.mCost || 0) > 0) {
        await prisma.expense.create({
          data: {
            farmId: farm.id,
            fieldId: kheeraField.id,
            cropId: kheeraCrop.id,
            stageNumber: s.num,
            category: s.lCost > s.mCost ? 'LABOUR' : 'FERTILIZERS',
            title: `${s.name} (Stage #${s.num})`,
            amount: (s.lCost || 0) + (s.mCost || 0),
            date: expDate,
            paymentStatus: 'PAID',
            paymentMode: 'CASH',
          },
        });
      }
    }

    // Add 2 Daily Harvest Logs for Kheera
    await prisma.harvestLog.create({
      data: {
        cropId: kheeraCrop.id,
        fieldId: kheeraField.id,
        harvestDate: kheeraFirstHarvest,
        quantity: 850,
        unit: 'Kg',
        grade: 'Grade A',
        cratesCount: 34,
        labourCount: 4,
        storageLocation: 'Farm Shed',
        notes: '1st picking - tender uniform size fruits',
      },
    });

    await prisma.harvestLog.create({
      data: {
        cropId: kheeraCrop.id,
        fieldId: kheeraField.id,
        harvestDate: now,
        quantity: 1000,
        unit: 'Kg',
        grade: 'Grade A',
        cratesCount: 40,
        labourCount: 5,
        storageLocation: 'Farm Shed - Ready for Mandi pickup',
        notes: '2nd picking - heavy flush',
      },
    });

    // Add a Mandi Sale slip for Kheera
    await prisma.cropSale.create({
      data: {
        cropId: kheeraCrop.id,
        buyerName: 'Aggarwal Vegetable Commission Agent',
        mandiName: 'Subzi Mandi',
        saleDate: now,
        quantity: 850,
        unit: 'Kg',
        pricePerUnit: 26, // ₹26/kg
        totalAmount: 22100,
        commission: 1326, // 6%
        transportCost: 800,
        hamaliCost: 350,
        deductions: 2476,
        netAmount: 19624,
        amountReceived: 15000,
        paymentStatus: 'PARTIAL',
        paymentMode: 'BANK_TRANSFER',
        invoiceNumber: `MND-KHEERA-${Date.now().toString().slice(-4)}`,
        notes: 'Grade A Kheera dispatched in 34 crates',
      },
    });
  }

  // 3. Setup Tomato (टमाटर) - 2 Acre
  // Suppose sown 30 days ago, so it is in Stage 7: CROP_CARE (Staking & Trellising)
  const tomatoSowingDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const tomatoExpectedHarvest = new Date(tomatoSowingDate.getTime() + 70 * 24 * 60 * 60 * 1000);

  let tomatoCrop = await prisma.crop.findFirst({
    where: { fieldId: tomatoField.id, name: { contains: 'Tomato' } },
  });

  if (!tomatoCrop) {
    tomatoCrop = await prisma.crop.create({
      data: {
        farmId: farm.id,
        fieldId: tomatoField.id,
        name: 'Tomato (टमाटर)',
        variety: 'Abhinav / US 1156 (Indeterminate)',
        season: 'RABI',
        area: 2.0,
        sowingDate: tomatoSowingDate,
        expectedHarvestDate: tomatoExpectedHarvest,
        expectedFirstHarvest: tomatoExpectedHarvest,
        estDaysToHarvest: 70,
        targetYield: 70000, // 70,000 kg (35,000 kg/acre)
        actualYield: 0,
        currentStageNumber: 7,
        currentStageName: 'Crop Care & Fertigation',
        status: 'GROWING',
        notes: 'High-density planting with bamboo wire staking and drip fertigation.',
      },
    });
    console.log('Created Tomato Crop (2 Acres):', tomatoCrop.id);

    // Create 9 stages for Tomato
    const tomatoStages = [
      { num: 1, key: 'FIELD_PREP', name: 'Field Preparation', hindi: 'जुताई व कल्टीवेशन', offset: -12, status: 'COMPLETED', lCost: 2800, mCost: 2000 },
      { num: 2, key: 'BED_PREP', name: 'Bed Preparation', hindi: 'बेड निर्माण', offset: -8, status: 'COMPLETED', lCost: 2200, mCost: 1000 },
      { num: 3, key: 'BASAL_DOSE', name: 'Basal Dose Application', hindi: 'बेसल डोज़ (आधार खाद)', offset: -5, status: 'COMPLETED', lCost: 1600, mCost: 8500, mat: '2 Trolley Gobar, 2 Bag DAP, 1 Bag MOP' },
      { num: 4, key: 'DRIP_SETUP', name: 'Drip Line Setup', hindi: 'ड्रिप लाइन बिछाना व टेस्टिंग', offset: -4, status: 'COMPLETED', lCost: 1500, mCost: 5500, mat: '16mm inline lateral pipe' },
      { num: 5, key: 'MULCHING', name: 'Mulching Film & Punching', hindi: 'मल्चिंग पेपर व होल पंचिंग', offset: -2, status: 'COMPLETED', lCost: 2400, mCost: 9000, mat: '4 rolls 25 micron silver-black mulch' },
      { num: 6, key: 'PLANTING', name: 'Planting / Sowing', hindi: 'रोपाई / बुवाई (Transplanting)', offset: 0, status: 'COMPLETED', lCost: 3200, mCost: 14000, mat: 'Nursery trays saplings (Abhinav) 13,000 plants' },
      { num: 7, key: 'CROP_CARE', name: 'Crop Care & Fertigation', hindi: 'फसल सुरक्षा, फर्टिगेशन व स्प्रे', offset: 10, status: 'IN_PROGRESS', lCost: 4500, mCost: 7500, mat: 'Bamboo poles, GI Wire, 19:19:19 & 12:61:00' },
      { num: 8, key: 'HARVESTING', name: 'Harvesting & Picking', hindi: 'तुड़ाई व पिकिंग (Daily/Weekly)', offset: 70, status: 'PENDING', lCost: 0, mCost: 0 },
      { num: 9, key: 'MANDI_SALE', name: 'Mandi Sale & Recovery', hindi: 'मंडी बिक्री व पेमेंट वसूली', offset: 71, status: 'PENDING', lCost: 0, mCost: 0 },
    ];

    for (const s of tomatoStages) {
      const expDate = new Date(tomatoSowingDate.getTime() + s.offset * 24 * 60 * 60 * 1000);
      await prisma.cropStage.create({
        data: {
          cropId: tomatoCrop.id,
          stageNumber: s.num,
          stageKey: s.key,
          stageName: s.name,
          hindiName: s.hindi,
          estDaysOffset: s.offset,
          expectedDate: expDate,
          actualDate: s.status === 'COMPLETED' ? expDate : null,
          status: s.status,
          labourCost: s.lCost || 0,
          materialCost: s.mCost || 0,
          totalCost: (s.lCost || 0) + (s.mCost || 0),
          materialItems: s.mat || '',
        },
      });

      if ((s.lCost || 0) + (s.mCost || 0) > 0) {
        await prisma.expense.create({
          data: {
            farmId: farm.id,
            fieldId: tomatoField.id,
            cropId: tomatoCrop.id,
            stageNumber: s.num,
            category: s.lCost > s.mCost ? 'LABOUR' : 'FERTILIZERS',
            title: `${s.name} (Stage #${s.num})`,
            amount: (s.lCost || 0) + (s.mCost || 0),
            date: expDate,
            paymentStatus: 'PAID',
            paymentMode: 'CASH',
          },
        });
      }
    }
  }

  // 4. Add Smart Reminders
  await prisma.farmReminder.createMany({
    data: [
      {
        farmId: farm.id,
        cropId: kheeraCrop.id,
        stageNumber: 8,
        title: 'Cucumber: 3rd Picking Schedule & Crates Preparation',
        category: 'HARVEST_WINDOW',
        dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        priority: 'URGENT',
        notes: 'Harvest expected ~1,200 kg. Ensure 50 empty crates are ready at farm shed.',
      },
      {
        farmId: farm.id,
        cropId: tomatoCrop.id,
        stageNumber: 7,
        title: 'Tomato: Staking Wire Tightening & Calcium-Boron Spray',
        category: 'SPRAY',
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        priority: 'HIGH',
        notes: 'Support branches to prevent soil contact; spray Calcium + Boron to prevent blossom end rot.',
      },
      {
        farmId: farm.id,
        cropId: kheeraCrop.id,
        stageNumber: 9,
        title: 'Cucumber: Follow up pending Mandi payment (₹4,624)',
        category: 'MANDI_PAYMENT',
        dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        priority: 'MEDIUM',
        notes: 'Balance due from Aggarwal Traders for Lot #1.',
      },
    ],
  });

  console.log('Successfully seeded Horticulture crops: Cucumber 4 Acre & Tomato 2 Acre with 9-stage workflows and reminders!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
