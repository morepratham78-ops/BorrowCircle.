import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Safety check: Prevent accidental destructive wipe on staging/production
  if ((process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') && process.env.FORCE_SEED !== 'true') {
    console.error('\n⚠️ [SEED ABORTED FOR DATA INTEGRITY]:');
    console.error('Database seeding wipes existing records and is blocked in staging/production.');
    console.error('To initialize a fresh database, pass FORCE_SEED=true explicitly.');
    console.error('Existing customer accounts, active bookings, and equipment were preserved.\n');
    process.exit(1);
  }

  console.log('Seeding BorrowCircle database with Indian marketplace data...');

  // 1. Clear existing records safely
  await prisma.review.deleteMany();
  await prisma.inspectionRecord.deleteMany();
  await prisma.extensionRequest.deleteMany();
  await prisma.damageClaim.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.wishWallPost.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.itemImage.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.communityGroup.deleteMany();
  await prisma.identityVerification.deleteMany();
  await prisma.phoneVerification.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash default passwords
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@BorrowCircle2026!';
  const adminHash = await bcrypt.hash(adminPassword, salt);

  // 3. Create Seed Users
  const admin = await prisma.user.create({
    data: {
      name: 'BorrowCircle Admin',
      email: 'admin@borrowcircle.in',
      phone: '+919999900000',
      passwordHash: adminHash,
      role: 'ADMIN',
      city: 'Bengaluru',
      area: 'Central Office',
      pincode: '560001',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      isPhoneVerified: true,
      isEmailVerified: true,
      isIdentityVerified: true,
      aadharVerified: true,
      trustScore: 100,
      rating: 5.0,
      rewardPoints: 500
    }
  });

  const rahul = await prisma.user.create({
    data: {
      name: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      phone: '+919876543210',
      passwordHash,
      role: 'USER',
      city: 'Bengaluru',
      area: 'Indiranagar',
      pincode: '560038',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      isPhoneVerified: true,
      isEmailVerified: true,
      isIdentityVerified: true,
      aadharVerified: true,
      trustScore: 94,
      rating: 4.9,
      ratingCount: 14,
      completedLendsCount: 18,
      completedRentalsCount: 5,
      ecoKgCo2Saved: 68.4,
      rewardPoints: 420
    }
  });

  const priya = await prisma.user.create({
    data: {
      name: 'Priya Patel',
      email: 'priya.patel@example.com',
      phone: '+919812345678',
      passwordHash,
      role: 'USER',
      city: 'Bengaluru',
      area: 'Koramangala',
      pincode: '560034',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      isPhoneVerified: true,
      isEmailVerified: true,
      isIdentityVerified: true,
      aadharVerified: true,
      trustScore: 88,
      rating: 4.8,
      ratingCount: 9,
      completedLendsCount: 4,
      completedRentalsCount: 11,
      ecoKgCo2Saved: 42.0,
      rewardPoints: 310
    }
  });

  const amit = await prisma.user.create({
    data: {
      name: 'Amit Verma',
      email: 'amit.verma@example.com',
      phone: '+919823456789',
      passwordHash,
      role: 'USER',
      city: 'Mumbai',
      area: 'Bandra West',
      pincode: '400050',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      isPhoneVerified: true,
      isEmailVerified: true,
      isIdentityVerified: true,
      aadharVerified: true,
      trustScore: 96,
      rating: 5.0,
      ratingCount: 22,
      completedLendsCount: 26,
      ecoKgCo2Saved: 95.2,
      rewardPoints: 600
    }
  });

  // 4. Create 12 Official Categories
  const categoriesData = [
    { name: 'Tools and Hardware', slug: 'tools-hardware', icon: 'Wrench', description: 'Power drills, saws, wrenches, ladders, and DIY gear', displayOrder: 1 },
    { name: 'Electronics', slug: 'electronics', icon: 'Tv', description: 'Projectors, monitors, audio systems, and gaming consoles', displayOrder: 2 },
    { name: 'Cameras and Photography', slug: 'cameras-photography', icon: 'Camera', description: 'DSLRs, mirrorless bodies, prime lenses, drones, and tripods', displayOrder: 3 },
    { name: 'Sports and Fitness', slug: 'sports-fitness', icon: 'Activity', description: 'Bicycles, cricket kits, dumbells, and camping gear', displayOrder: 4 },
    { name: 'Gardening Equipment', slug: 'gardening-equipment', icon: 'Trees', description: 'Lawn mowers, hedge trimmers, leaf blowers, and hoses', displayOrder: 5 },
    { name: 'Home Appliances', slug: 'home-appliances', icon: 'Sparkles', description: 'Pressure washers, vacuum cleaners, and steamers', displayOrder: 6 },
    { name: 'Furniture', slug: 'furniture', icon: 'Armchair', description: 'Foldable tables, ergonomic chairs, and event seating', displayOrder: 7 },
    { name: 'Construction Equipment', slug: 'construction-equipment', icon: 'Hammer', description: 'Concrete mixers, scaffolding, and demolition hammers', displayOrder: 8 },
    { name: 'Event Equipment', slug: 'event-equipment', icon: 'PartyPopper', description: 'PA speakers, party lighting, microphones, and marquees', displayOrder: 9 },
    { name: 'Study and College Resources', slug: 'study-college', icon: 'BookOpen', description: 'Microscopes, drafting tables, and lab calculators', displayOrder: 10 },
    { name: 'Travel Equipment', slug: 'travel-equipment', icon: 'Compass', description: 'Rucksacks, roof racks, sleeping bags, and action cams', displayOrder: 11 },
    { name: 'Agriculture Equipment', slug: 'agriculture-equipment', icon: 'Wheat', description: 'Water pumps, weeders, power tillers, and sprayers', displayOrder: 12 }
  ];

  const catMap = new Map<string, any>();
  for (const c of categoriesData) {
    const created = await prisma.category.create({ data: c });
    catMap.set(c.slug, created);
  }

  // 5. Seed Real Indian Items
  const itemsData = [
    {
      title: 'Bosch Professional Rotary Hammer Drill GBH 220',
      slug: 'bosch-rotary-hammer-drill-gbh-220',
      description: 'Heavy duty 720W rotary hammer drill with SDS-plus chuck. Perfect for concrete drilling, wall anchors, and brick chipping. Includes masonry drill bit set.',
      categoryId: catMap.get('tools-hardware').id,
      condition: 'EXCELLENT',
      purchasePrice: 6500,
      replacementValue: 6200,
      hourlyRate: 50,
      dailyRate: 350,
      minHours: 2,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'Indiranagar',
      pincode: '560038',
      pickupAddress: '12th Main Road, near Metro Station, Indiranagar',
      isDeliveryAvailable: true,
      deliveryFee: 60,
      usageInstructions: 'Wear safety goggles. Use SDS-plus bits only. Grease drill chuck before heavy duty chiseling.',
      safetyGuidelines: 'Keep fingers away from rotating chuck. Verify concealed electrical wiring before wall drilling.',
      damageConditions: 'Any bent motor spindle or cracked body casing will be assessed at repair cost.',
      status: 'APPROVED',
      ownerId: rahul.id,
      passportSerial: 'BC-IN-BOSCH-7741',
      maintenanceLog: 'Motor brushes serviced Oct 2026. Cable insulation verified.',
      images: [
        'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'Sony Alpha A7 IV Mirrorless Camera + 24-70mm GM Lens',
      slug: 'sony-alpha-a7-iv-mirrorless-camera',
      description: 'Full-frame 33MP hybrid photo & 4K 60p video camera. Outstanding autofocus, 10-bit 4:2:2 color. Ideal for wedding shoots, portfolio portraits, and short films.',
      categoryId: catMap.get('cameras-photography').id,
      condition: 'EXCELLENT',
      purchasePrice: 285000,
      replacementValue: 240000,
      hourlyRate: 180,
      dailyRate: 1600,
      minHours: 3,
      securityDeposit: 0,
      city: 'Mumbai',
      area: 'Bandra West',
      pincode: '400050',
      pickupAddress: 'Hill Road, near Mehboob Studios, Bandra West',
      isDeliveryAvailable: false,
      deliveryFee: 0,
      usageInstructions: 'Always use camera neck strap. Keep sensor cap on during lens changes. Handle G-Master glass with microfiber only.',
      safetyGuidelines: 'Avoid rain or salty beach air without rain sleeve.',
      damageConditions: 'Any lens scratch or sensor speck requires professional authorized Sony service check.',
      status: 'APPROVED',
      ownerId: amit.id,
      passportSerial: 'BC-IN-SONY-9921',
      maintenanceLog: 'Sensor wet-cleaned Sep 2026. Firmware 3.01 installed.',
      images: [
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'Epson EpiqVision Full HD 1080p Smart Cinema Projector',
      slug: 'epson-full-hd-smart-projector',
      description: 'High brightness 3000 lumens 1080p home theatre projector with built-in Android TV, HDMI, and rich stereo sound. Perfect for rooftop match screenings and movie nights.',
      categoryId: catMap.get('electronics').id,
      condition: 'VERY_GOOD',
      purchasePrice: 58000,
      replacementValue: 48000,
      hourlyRate: 85,
      dailyRate: 700,
      minHours: 2,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'Koramangala',
      pincode: '560034',
      pickupAddress: '4th Block, 80 Feet Road, Koramangala',
      isDeliveryAvailable: true,
      deliveryFee: 80,
      usageInstructions: 'Ensure ventilation vents are clear. Let lamp cool down before switching off mains.',
      safetyGuidelines: 'Never stare directly into projector beam lens.',
      damageConditions: 'Bulb damage from sudden unplugging charged at lamp replacement cost.',
      status: 'APPROVED',
      ownerId: priya.id,
      passportSerial: 'BC-IN-EPSON-4130',
      maintenanceLog: 'Dust filter cleared Nov 2026. Lamp hours: 140/5000.',
      images: [
        'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'Kärcher K2 Compact High Pressure Washer (110 Bar)',
      slug: 'karcher-k2-compact-high-pressure-washer',
      description: 'Compact high-pressure car and patio cleaner with dirt blaster lance. Cleans driveways, bikes, garden furniture, and exterior walls effortlessly.',
      categoryId: catMap.get('home-appliances').id,
      condition: 'GOOD',
      purchasePrice: 9500,
      replacementValue: 8000,
      hourlyRate: 45,
      dailyRate: 300,
      minHours: 2,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'Indiranagar',
      pincode: '560038',
      pickupAddress: 'HAL 2nd Stage, Indiranagar',
      isDeliveryAvailable: true,
      deliveryFee: 50,
      usageInstructions: 'Connect to standard 1/2 inch garden hose with constant water flow before turning motor on.',
      safetyGuidelines: 'Do not spray people, pets, or electrical sockets.',
      damageConditions: 'Dry-running motor will cause pump seizure; user must verify continuous water feed.',
      status: 'APPROVED',
      ownerId: rahul.id,
      passportSerial: 'BC-IN-KARCHER-1102',
      maintenanceLog: 'Inlet filter cleaned. High pressure hose replaced Oct 2026.',
      images: [
        'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'JBL PartyBox 310 Bluetooth High-Power Party Speaker',
      slug: 'jbl-partybox-310-party-speaker',
      description: '240W RMS massive sound with dynamic light show, dual mic inputs for karaoke, wheels for easy transport, and up to 18 hours of battery life.',
      categoryId: catMap.get('event-equipment').id,
      condition: 'EXCELLENT',
      purchasePrice: 42000,
      replacementValue: 38000,
      hourlyRate: 110,
      dailyRate: 950,
      minHours: 2,
      securityDeposit: 0,
      city: 'Mumbai',
      area: 'Bandra West',
      pincode: '400050',
      pickupAddress: 'Pali Hill, Bandra West',
      isDeliveryAvailable: true,
      deliveryFee: 100,
      usageInstructions: 'Charges in 3.5 hours. Includes 2 wireless UHF mics and aux cable.',
      safetyGuidelines: 'Splashproof IPX4. Avoid direct water immersion.',
      damageConditions: 'Cone tear or dented metal grille requires JBL authorized repair.',
      status: 'APPROVED',
      ownerId: amit.id,
      passportSerial: 'BC-IN-JBL-3301',
      maintenanceLog: 'Battery health tested 98%. Firmware updated.',
      images: [
        'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'Quechua 4-Person Waterproof Camping Tent + Sleeping Bags',
      slug: 'quechua-4-person-waterproof-camping-tent',
      description: 'Decathlon Arpenaz 4.1 family tent with standing height living area. Includes groundsheet, pegs, and 2 Quechua 10°C sleeping bags. Tested in Western Ghats monsoons.',
      categoryId: catMap.get('travel-equipment').id,
      condition: 'VERY_GOOD',
      purchasePrice: 11000,
      replacementValue: 9500,
      hourlyRate: 35,
      dailyRate: 280,
      minHours: 4,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'Indiranagar',
      pincode: '560038',
      pickupAddress: 'Near Defence Colony, Indiranagar',
      isDeliveryAvailable: false,
      deliveryFee: 0,
      usageInstructions: 'Pitch on clear flat ground. Ensure flysheet guy ropes are firmly tensioned.',
      safetyGuidelines: 'No open flames or cooking inside the tent.',
      damageConditions: 'Torn tent fabric or bent fiberglass poles must be compensated.',
      status: 'APPROVED',
      ownerId: rahul.id,
      passportSerial: 'BC-IN-TENT-8841',
      maintenanceLog: 'Waterproof seam tape checked. Thoroughly dried and aired out.',
      images: [
        'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'Honda 1.5 HP 4-Stroke Petrol Agricultural Water Pump',
      slug: 'honda-agricultural-water-pump',
      description: 'Reliable 4-stroke Honda petrol engine with high delivery volume (300 L/min). Essential for drip irrigation, farm drainage, or construction site de-watering.',
      categoryId: catMap.get('agriculture-equipment').id,
      condition: 'GOOD',
      purchasePrice: 24000,
      replacementValue: 20000,
      hourlyRate: 75,
      dailyRate: 550,
      minHours: 3,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'Whitefield',
      pincode: '560066',
      pickupAddress: 'Near Varthur Road, Whitefield',
      isDeliveryAvailable: true,
      deliveryFee: 150,
      usageInstructions: 'Check engine oil level before startup. Use clean unleaded petrol.',
      safetyGuidelines: 'Operate in open ventilated spaces only. Exhaust gases contain carbon monoxide.',
      damageConditions: 'Any dry pump damage or water ingestion into carburettor will be charged.',
      status: 'APPROVED',
      ownerId: rahul.id,
      passportSerial: 'BC-IN-PUMP-5521',
      maintenanceLog: 'Spark plug and air filter replaced Oct 2026.',
      images: [
        'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'Olympus Binocular Biological Microscope 1000x',
      slug: 'olympus-binocular-biological-microscope',
      description: 'High precision lab-grade microscope with achromatic 4x, 10x, 40x, 100x oil immersion objectives. LED illumination. Suitable for medical, biotech, and college projects.',
      categoryId: catMap.get('study-college').id,
      condition: 'EXCELLENT',
      purchasePrice: 32000,
      replacementValue: 28000,
      hourlyRate: 40,
      dailyRate: 300,
      minHours: 2,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'Koramangala',
      pincode: '560034',
      pickupAddress: 'Near Christ University, Koramangala',
      isDeliveryAvailable: false,
      deliveryFee: 0,
      usageInstructions: 'Carry with both hands. Clean oil immersion lens with lens paper only.',
      safetyGuidelines: 'Keep away from moisture and chemical reagents.',
      damageConditions: 'Scratched ocular or objective lenses will be assessed at genuine replacement cost.',
      status: 'APPROVED',
      ownerId: priya.id,
      passportSerial: 'BC-IN-MICROSCOPE-0911',
      maintenanceLog: 'Optical alignment calibrated. Stage tension adjusted.',
      images: [
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'DeWalt 18V XR Cordless 184mm Circular Saw',
      slug: 'dewalt-18v-cordless-circular-saw',
      description: 'High performance brushless circular saw for accurate cross-cuts and rip cuts in solid wood, MDF, and plywood. Includes 2x 5Ah lithium batteries and fast charger.',
      categoryId: catMap.get('construction-equipment').id,
      condition: 'VERY_GOOD',
      purchasePrice: 22000,
      replacementValue: 19500,
      hourlyRate: 65,
      dailyRate: 480,
      minHours: 2,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'Indiranagar',
      pincode: '560038',
      pickupAddress: '100 Feet Road, Indiranagar',
      isDeliveryAvailable: true,
      deliveryFee: 60,
      usageInstructions: 'Verify workpiece is clamped securely before cutting. Never force the blade.',
      safetyGuidelines: 'Wear ear and eye protection. Keep hands behind the guide baseplate.',
      damageConditions: 'Blade replacement fee applies if teeth are chipped on embedded metal or nails.',
      status: 'APPROVED',
      ownerId: rahul.id,
      passportSerial: 'BC-IN-DEWALT-4411',
      maintenanceLog: '24T carbide blade sharpened Oct 2026.',
      images: [
        'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=800&q=80'
      ]
    },
    // Item pending approval to test admin workflow!
    {
      title: 'DJI Mini 3 Pro Drone with 4K HDR & Smart Controller',
      slug: 'dji-mini-3-pro-drone-4k',
      description: 'Ultralight sub-249g drone with tri-directional obstacle sensing, true vertical shooting, and up to 34 mins flight time per battery. Includes 3 batteries and ND filter set.',
      categoryId: catMap.get('cameras-photography').id,
      condition: 'EXCELLENT',
      purchasePrice: 85000,
      replacementValue: 75000,
      hourlyRate: 150,
      dailyRate: 1200,
      minHours: 2,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'Indiranagar',
      pincode: '560038',
      pickupAddress: 'Near Metro Station, Indiranagar',
      isDeliveryAvailable: true,
      deliveryFee: 100,
      usageInstructions: 'DGCA registration certificate in carry case. Fly in Green Zone only.',
      safetyGuidelines: 'Keep away from airport exclusion zones and military areas. Do not fly in rain.',
      damageConditions: 'Gimbal or motor arm cracks will be assessed at DJI service center repair invoice.',
      status: 'PENDING_APPROVAL', // Strict test item for Admin Approval flow!
      ownerId: rahul.id,
      passportSerial: 'BC-IN-DJI-MINI3-6012',
      maintenanceLog: 'Props inspected. Calibrated IMU and compass.',
      images: [
        'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'Makita 125mm Cordless Brushless Angle Grinder',
      slug: 'makita-125mm-cordless-angle-grinder',
      description: 'Brushless 18V angle grinder with electric brake, soft start, and anti-restart protection. Perfect for metal cutting, weld cleanup, and tile grinding.',
      categoryId: catMap.get('tools-hardware').id,
      condition: 'EXCELLENT',
      purchasePrice: 14500,
      replacementValue: 12000,
      hourlyRate: 45,
      dailyRate: 320,
      minHours: 2,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'Indiranagar',
      pincode: '560038',
      pickupAddress: 'Defence Colony, Indiranagar',
      isDeliveryAvailable: true,
      deliveryFee: 40,
      usageInstructions: 'Always mount guard securely and use two hands on side handle.',
      safetyGuidelines: 'Wear full-face safety shield and leather work gloves.',
      damageConditions: 'Inspect disc arbor for runout before return.',
      status: 'APPROVED',
      ownerId: priya.id,
      passportSerial: 'BC-IN-MAKITA-8821',
      maintenanceLog: 'Motor brushes inspected and guard tightened.',
      images: [
        'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'Stanley Cross-Line 360 Self-Leveling Laser with Tripod',
      slug: 'stanley-cross-line-360-laser-level',
      description: 'High precision 360° green beam self-leveling laser level for framing, tile layout, interior decoration, and drop ceiling installation. Range up to 30m.',
      categoryId: catMap.get('tools-hardware').id,
      condition: 'EXCELLENT',
      purchasePrice: 16000,
      replacementValue: 13500,
      hourlyRate: 35,
      dailyRate: 260,
      minHours: 2,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'Koramangala',
      pincode: '560034',
      pickupAddress: '5th Block, Koramangala',
      isDeliveryAvailable: false,
      deliveryFee: 0,
      usageInstructions: 'Lock pendulum mechanism before transporting in protective case.',
      safetyGuidelines: 'Never look directly into laser aperture.',
      damageConditions: 'Calibration fee charged if dropped with unlocked pendulum.',
      status: 'APPROVED',
      ownerId: rahul.id,
      passportSerial: 'BC-IN-STANLEY-1029',
      maintenanceLog: 'Leveled and battery pack charged Oct 2026.',
      images: [
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'GoPro HERO 11 Black Creator Edition Bundle',
      slug: 'gopro-hero-11-creator-edition',
      description: '5.3K 60fps action camera with Volta battery grip, Media Mod directional mic, and Light Mod. Includes 256GB SanDisk Extreme micro-SD card and underwater housing.',
      categoryId: catMap.get('cameras-photography').id,
      condition: 'EXCELLENT',
      purchasePrice: 58000,
      replacementValue: 50000,
      hourlyRate: 90,
      dailyRate: 720,
      minHours: 2,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'Indiranagar',
      pincode: '560038',
      pickupAddress: '12th Main Road, Indiranagar',
      isDeliveryAvailable: true,
      deliveryFee: 50,
      usageInstructions: 'Ensure side door is fully latched before water use.',
      safetyGuidelines: 'Use tether cord when mounting outside vehicles.',
      damageConditions: 'Scratched lens protector replaced at ₹1,200.',
      status: 'APPROVED',
      ownerId: priya.id,
      passportSerial: 'BC-IN-GOPRO-7734',
      maintenanceLog: 'Firmware updated to v2.30. Clean seals.',
      images: [
        'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'Manfrotto 055 Aluminium 3-Section Pro Tripod',
      slug: 'manfrotto-055-pro-tripod',
      description: 'Sturdy studio tripod with 90° horizontal center column mechanism and XPRO 3-way pan-tilt head. Supports heavy camera rigs up to 9kg.',
      categoryId: catMap.get('cameras-photography').id,
      condition: 'EXCELLENT',
      purchasePrice: 24000,
      replacementValue: 20000,
      hourlyRate: 30,
      dailyRate: 220,
      minHours: 2,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'HSR Layout',
      pincode: '560102',
      pickupAddress: 'Sector 3, HSR Layout',
      isDeliveryAvailable: true,
      deliveryFee: 40,
      usageInstructions: 'Quick power locks on leg sections allow rapid setup.',
      safetyGuidelines: 'Check plate safety latch before releasing hands from camera.',
      damageConditions: 'Bent leg tubes or missing rubber feet assessed at replacement cost.',
      status: 'APPROVED',
      ownerId: rahul.id,
      passportSerial: 'BC-IN-MANFROTTO-4001',
      maintenanceLog: 'Leg joints greased and level vials calibrated.',
      images: [
        'https://images.unsplash.com/photo-1495745966610-2a67f2297e5e?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'Sony PlayStation 5 Console with 2 DualSense Controllers',
      slug: 'sony-playstation-5-console-bundle',
      description: 'PS5 Disc Edition with ultra-high speed SSD, ray tracing, 4K gaming, 2 DualSense wireless controllers, and FIFA 24 / Spider-Man 2 pre-installed.',
      categoryId: catMap.get('electronics').id,
      condition: 'EXCELLENT',
      purchasePrice: 55000,
      replacementValue: 48000,
      hourlyRate: 110,
      dailyRate: 850,
      minHours: 3,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'Koramangala',
      pincode: '560034',
      pickupAddress: 'Near Sony World Signal, Koramangala',
      isDeliveryAvailable: true,
      deliveryFee: 60,
      usageInstructions: 'Use HDMI 2.1 cable provided for 120Hz display modes.',
      safetyGuidelines: 'Keep console vertical with stand attached and vents clear.',
      damageConditions: 'Stick drift or liquid spills covered under user liability.',
      status: 'APPROVED',
      ownerId: priya.id,
      passportSerial: 'BC-IN-PS5-9012',
      maintenanceLog: 'System software updated and controllers sanitized.',
      images: [
        'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'BenQ 100-inch HD Portable Tripod Projector Screen',
      slug: 'benq-100-inch-tripod-projector-screen',
      description: 'Matte white 1.1 gain projector screen with high-contrast black masking borders and height-adjustable tripod stand. Packs into durable carry bag.',
      categoryId: catMap.get('electronics').id,
      condition: 'EXCELLENT',
      purchasePrice: 9000,
      replacementValue: 7500,
      hourlyRate: 25,
      dailyRate: 180,
      minHours: 2,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'Indiranagar',
      pincode: '560038',
      pickupAddress: 'HAL 2nd Stage, Indiranagar',
      isDeliveryAvailable: false,
      deliveryFee: 0,
      usageInstructions: 'Roll and unroll fabric steadily from center handle.',
      safetyGuidelines: 'Weigh down tripod feet in outdoor windy conditions.',
      damageConditions: 'Creases or stains on projection surface incur cleaning fee.',
      status: 'APPROVED',
      ownerId: rahul.id,
      passportSerial: 'BC-IN-SCREEN-2219',
      maintenanceLog: 'Cleaned with microfiber and retractor tension verified.',
      images: [
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'Stihl MS 180 16-inch Petrol Chainsaw',
      slug: 'stihl-ms-180-petrol-chainsaw',
      description: 'Lightweight and durable 31.8cc chainsaw with QuickStop chain brake and anti-vibration system. Ideal for trimming trees, firewood cutting, and garden clearing.',
      categoryId: catMap.get('gardening-equipment').id,
      condition: 'VERY_GOOD',
      purchasePrice: 21000,
      replacementValue: 18000,
      hourlyRate: 85,
      dailyRate: 650,
      minHours: 2,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'Whitefield',
      pincode: '560066',
      pickupAddress: 'ITPL Main Road, Whitefield',
      isDeliveryAvailable: true,
      deliveryFee: 80,
      usageInstructions: 'Use 2-stroke petrol pre-mix ratio 50:1. Chain oil tank must remain topped up.',
      safetyGuidelines: 'Full PPE mandatory: cut-resistant chaps, helmet with mesh visor, and steel-toe boots.',
      damageConditions: 'Chain sharpening or replacement if run into stones or dirt.',
      status: 'APPROVED',
      ownerId: priya.id,
      passportSerial: 'BC-IN-STIHL-5510',
      maintenanceLog: 'Chain filed and spark arrestor cleaned.',
      images: [
        'https://images.unsplash.com/photo-1622372738946-62e02505feb3?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'Trek Marlin 7 Hardtail Mountain Bike',
      slug: 'trek-marlin-7-mountain-bike',
      description: 'Cross-country trail bike with RockShox Judy suspension fork, Shimano Deore 1x10 drivetrain, and hydraulic disc brakes. Size M (5ft 6in - 5ft 10in rider).',
      categoryId: catMap.get('sports-fitness').id,
      condition: 'EXCELLENT',
      purchasePrice: 62000,
      replacementValue: 52000,
      hourlyRate: 50,
      dailyRate: 380,
      minHours: 2,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'Indiranagar',
      pincode: '560038',
      pickupAddress: '100 Feet Road, Indiranagar',
      isDeliveryAvailable: false,
      deliveryFee: 0,
      usageInstructions: 'Adjust saddle height with quick release clamp before riding.',
      safetyGuidelines: 'Certified bicycle helmet and safety lights provided.',
      damageConditions: 'Tube punctures must be patched or ₹150 tube replacement applied.',
      status: 'APPROVED',
      ownerId: rahul.id,
      passportSerial: 'BC-IN-TREK-3341',
      maintenanceLog: 'Brakes bled, chain lubricated, tires at 32 PSI.',
      images: [
        'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'Osprey Aether 65L Expedition Backpacking Rucksack',
      slug: 'osprey-aether-65l-rucksack',
      description: 'Heavy load backpacking pack with Custom Fit-on-the-Fly hipbelt, AirScape suspension, integrated raincover, and sleeping bag compartment. For Himalayan treks.',
      categoryId: catMap.get('travel-equipment').id,
      condition: 'EXCELLENT',
      purchasePrice: 28000,
      replacementValue: 24000,
      hourlyRate: 40,
      dailyRate: 280,
      minHours: 2,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'Koramangala',
      pincode: '560034',
      pickupAddress: '1st Block, Koramangala',
      isDeliveryAvailable: true,
      deliveryFee: 40,
      usageInstructions: 'Adjust torso length harness to match user back measurement.',
      safetyGuidelines: 'Use flight duffel bag when checking into airlines.',
      damageConditions: 'Torn mesh or broken buckles assessed at repair cost.',
      status: 'APPROVED',
      ownerId: priya.id,
      passportSerial: 'BC-IN-OSPREY-9921',
      maintenanceLog: 'Hand-washed with Nikwax Tech Wash Oct 2026.',
      images: [
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'Behringer Xenyx 802 Audio Mixer & Dual Shure SM58 Mics',
      slug: 'behringer-xenyx-802-mixer-bundle',
      description: 'Premium compact audio mixer with British EQ and phantom power, bundled with 2 genuine Shure SM58 vocal microphones, XLR cables, and boom stands.',
      categoryId: catMap.get('event-equipment').id,
      condition: 'EXCELLENT',
      purchasePrice: 26000,
      replacementValue: 22000,
      hourlyRate: 75,
      dailyRate: 550,
      minHours: 2,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'Indiranagar',
      pincode: '560038',
      pickupAddress: 'Near BDA Complex, Indiranagar',
      isDeliveryAvailable: true,
      deliveryFee: 50,
      usageInstructions: 'Connect mains power supply before plugging in audio inputs.',
      safetyGuidelines: 'Keep gain knobs below clipping threshold to protect speakers.',
      damageConditions: 'Dented microphone grilles or damaged cords incur replacement fee.',
      status: 'APPROVED',
      ownerId: rahul.id,
      passportSerial: 'BC-IN-BEHRINGER-6019',
      maintenanceLog: 'Faders deoxidized and tested with PA system.',
      images: [
        'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'Godox SL60W Video Studio Continuous LED Light',
      slug: 'godox-sl60w-continuous-led-light',
      description: '60W daylight-balanced 5600K LED continuous light with Bowens mount, 90cm octabox with grid, heavy duty air-cushioned light stand, and remote control.',
      categoryId: catMap.get('cameras-photography').id,
      condition: 'EXCELLENT',
      purchasePrice: 18500,
      replacementValue: 15000,
      hourlyRate: 45,
      dailyRate: 340,
      minHours: 2,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'HSR Layout',
      pincode: '560102',
      pickupAddress: 'Sector 1, HSR Layout',
      isDeliveryAvailable: true,
      deliveryFee: 40,
      usageInstructions: 'Allow fan to run 2 minutes after switching off before packing.',
      safetyGuidelines: 'Keep away from flammable studio curtains or water spray.',
      damageConditions: 'COB LED diode impact damage covered by borrower liability.',
      status: 'APPROVED',
      ownerId: priya.id,
      passportSerial: 'BC-IN-GODOX-3312',
      maintenanceLog: 'Silent fan bearing checked and CRI measured at 96+.',
      images: [
        'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'Heavy Duty 16.5ft Aluminium Telescopic Extension Ladder',
      slug: 'heavy-duty-16ft-telescopic-ladder',
      description: 'EN131 certified aerospace aluminium telescopic ladder with 150kg weight capacity. Extends from 3ft compact storage to 16.5ft reach with auto-locking rungs.',
      categoryId: catMap.get('tools-hardware').id,
      condition: 'EXCELLENT',
      purchasePrice: 13000,
      replacementValue: 11000,
      hourlyRate: 35,
      dailyRate: 240,
      minHours: 2,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'Koramangala',
      pincode: '560034',
      pickupAddress: '8th Block, Koramangala',
      isDeliveryAvailable: false,
      deliveryFee: 0,
      usageInstructions: 'Verify each rung click-lock indicator turns green before climbing.',
      safetyGuidelines: 'Maintain 75-degree angle (4-in-1 rule) against wall.',
      damageConditions: 'Bent locking pins or damaged feet require complete replacement.',
      status: 'APPROVED',
      ownerId: rahul.id,
      passportSerial: 'BC-IN-LADDER-8819',
      maintenanceLog: 'Rung locks lubricated with dry silicone spray.',
      images: [
        'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      title: 'Wagner Control Pro 250M High Efficiency Airless Paint Sprayer',
      slug: 'wagner-control-pro-250m-paint-sprayer',
      description: 'HEA technology airless sprayer producing 55% less overspray. Coats interior walls, fences, and ceilings with emulsion or gloss paint in minutes.',
      categoryId: catMap.get('construction-equipment').id,
      condition: 'EXCELLENT',
      purchasePrice: 42000,
      replacementValue: 36000,
      hourlyRate: 95,
      dailyRate: 750,
      minHours: 2,
      securityDeposit: 0,
      city: 'Bengaluru',
      area: 'Indiranagar',
      pincode: '560038',
      pickupAddress: 'CMH Road, Indiranagar',
      isDeliveryAvailable: true,
      deliveryFee: 70,
      usageInstructions: 'Flush pump with warm soapy water immediately after emulsion painting.',
      safetyGuidelines: 'Relieve line pressure before removing spray tip or filters.',
      damageConditions: 'Hardened paint clogging pump cylinder incurs ₹2,500 cleaning surcharge.',
      status: 'APPROVED',
      ownerId: priya.id,
      passportSerial: 'BC-IN-WAGNER-1102',
      maintenanceLog: 'Packings lubricated and tip seals replaced.',
      images: [
        'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80'
      ]
    }
  ];

  const createdItems = [];
  for (const itemData of itemsData) {
    const { images, ...rest } = itemData;
    const item = await prisma.item.create({
      data: {
        ...rest,
        images: {
          create: images.map((url, idx) => ({ url, isPrimary: idx === 0 }))
        }
      }
    });
    createdItems.push(item);
  }

  // 6. Create realistic sample active booking with live timer for demo!
  const drillItem = createdItems[0];
  const now = new Date();
  const startTime = new Date(now.getTime() - 45 * 60 * 1000); // 45 mins ago
  const expectedEndTime = new Date(now.getTime() + 1 * 60 * 60 * 1000 + 15 * 60 * 1000); // 1h 15m remaining

  const activeBooking = await prisma.booking.create({
    data: {
      bookingNumber: 'BC-DEMO-LIVE-901',
      itemId: drillItem.id,
      receiverId: priya.id,
      lenderId: rahul.id,
      status: 'ACTIVE',
      durationHours: 2,
      hourlyRate: 50,
      rentalAmount: 100,
      receiverFee: 15,
      lenderFee: 15,
      securityDeposit: 0,
      deliveryFee: 60,
      totalPayableAmount: 975,
      lenderEarnings: 85,
      platformRevenue: 30,
      startTime,
      expectedEndTime,
      actualStartTime: startTime,
      isHandoverVerified: true,
      handoverVerifiedAt: startTime,
      handoverOtp: '482910',
      returnOtp: '719340',
      inspectionDurationMinutes: 15,
      notes: 'Need for fitting bookshelf in study room.'
    }
  });

  // Create initial condition inspection record
  await prisma.inspectionRecord.create({
    data: {
      bookingId: activeBooking.id,
      stage: 'HANDOVER',
      conditionNotes: 'Drill verified with chuck key, SDS bit set, and intact 3m power cable.',
      imageUrls: JSON.stringify([
        'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80'
      ]),
      hasDamage: false
    }
  });

  // Create payment record
  await prisma.payment.create({
    data: {
      bookingId: activeBooking.id,
      payerId: priya.id,
      amount: 975,
      currency: 'INR',
      paymentMethod: 'UPI',
      upiId: 'priyapatel@oksbi',
      transactionId: 'TXN-UPI-9928172648',
      status: 'SUCCESS',
      paymentType: 'RENTAL_AND_DEPOSIT'
    }
  });

  // Create past completed booking with review!
  const projectorItem = createdItems[2];
  const pastStart = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  const pastEnd = new Date(pastStart.getTime() + 4 * 60 * 60 * 1000);

  const completedBooking = await prisma.booking.create({
    data: {
      bookingNumber: 'BC-DEMO-DONE-102',
      itemId: projectorItem.id,
      receiverId: rahul.id,
      lenderId: priya.id,
      status: 'COMPLETED',
      durationHours: 4,
      hourlyRate: 85,
      rentalAmount: 340,
      receiverFee: 15,
      lenderFee: 15,
      securityDeposit: 0,
      deliveryFee: 0,
      totalPayableAmount: 1555,
      lenderEarnings: 325,
      platformRevenue: 30,
      startTime: pastStart,
      expectedEndTime: pastEnd,
      actualStartTime: pastStart,
      actualEndTime: pastEnd,
      isHandoverVerified: true,
      isReturnVerified: true,
      inspectionStatus: 'CLEAN',
      notes: 'Weekend community movie night.'
    }
  });

  // Review for completed rental
  await prisma.review.create({
    data: {
      bookingId: completedBooking.id,
      itemId: projectorItem.id,
      reviewerId: rahul.id,
      revieweeId: priya.id,
      role: 'RECEIVER',
      rating: 5,
      comment: 'Super sharp 1080p picture quality! Priya gave clear setup tips and HDMI cables. Fantastic sharing experience.'
    }
  });

  // 7. Seed Community Groups
  await prisma.communityGroup.createMany({
    data: [
      {
        name: 'Indiranagar Resident Sharers & DIYers',
        type: 'NEIGHBORHOOD',
        city: 'Bengaluru',
        area: 'Indiranagar',
        memberCount: 342,
        description: 'Neighbors in Indiranagar sharing home tools, ladders, camping tents, and party electronics.',
        icon: 'Home'
      },
      {
        name: 'Koramangala Tech & Creative Circle',
        type: 'COLLEGE',
        city: 'Bengaluru',
        area: 'Koramangala',
        memberCount: 285,
        description: 'Students and tech founders exchanging camera rigs, studio mics, monitors, and 3D printers.',
        icon: 'Laptop'
      },
      {
        name: 'Prestige Lakeside Habitat Community',
        type: 'HOUSING_SOCIETY',
        city: 'Bengaluru',
        area: 'Whitefield',
        memberCount: 512,
        description: 'Gated community equipment sharing: high pressure washers, garden tools, and badminton sets.',
        icon: 'Building'
      },
      {
        name: 'Bandra Film & Photography Collective',
        type: 'NEIGHBORHOOD',
        city: 'Mumbai',
        area: 'Bandra West',
        memberCount: 420,
        description: 'Professional photographers, indie cinematographers, and creators sharing cameras & lighting.',
        icon: 'Camera'
      }
    ]
  });

  // 8. Seed Community Wish Wall
  await prisma.wishWallPost.createMany({
    data: [
      {
        userId: priya.id,
        itemTitle: 'Telescopic Aluminum Extension Ladder (12ft - 16ft)',
        categoryId: catMap.get('tools-hardware').id,
        maxBudgetPerHour: 40,
        neededHours: 3,
        city: 'Bengaluru',
        area: 'Koramangala',
        description: 'Need to clean ceiling fan and touch up wall paint this Saturday. Will pick up and drop back.'
      },
      {
        userId: rahul.id,
        itemTitle: 'Acoustic Guitar with Soft Gig Bag',
        categoryId: catMap.get('electronics').id,
        maxBudgetPerHour: 35,
        neededHours: 5,
        city: 'Bengaluru',
        area: 'Indiranagar',
        description: 'Hosting an acoustic jam session for friends. Looking for a well-tuned dreadnought guitar.'
      }
    ]
  });

  // 9. Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: priya.id,
        title: 'Rental Active — Bosch Rotary Hammer Drill ⏱️',
        message: 'Your active rental is running. Return scheduled for today. Check live timer in My Rentals.',
        type: 'BOOKING',
        link: `/bookings/${activeBooking.id}`
      },
      {
        userId: rahul.id,
        title: 'Active Lender Session 🤝',
        message: 'Priya Patel is currently using your Bosch Hammer Drill. Handover confirmed with dual OTP.',
        type: 'HANDOVER',
        link: `/bookings/${activeBooking.id}`
      }
    ]
  });

  console.log('Seed completed successfully!');
  console.log('Sample Logins:');
  console.log(`1. Admin: admin@borrowcircle.in / ${adminPassword}`);
  console.log('2. Lender (Rahul): rahul.sharma@example.com / password123 (or +919876543210)');
  console.log('3. Borrower (Priya): priya.patel@example.com / password123 (or +919812345678)');
  console.log('4. Mumbai Lender (Amit): amit.verma@example.com / password123 (or +919823456789)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
