/* eslint-disable no-console */
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/utils/password';
import { generateOrderNumber, generateTransactionId } from '../src/utils/generateId';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (n: number): Date => new Date(Date.now() + n * DAY_MS);

const SEED_PASSWORD = 'Password123';

async function clearExistingData(): Promise<void> {
  console.log('Clearing existing data...');
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.rentalOrderItem.deleteMany();
  await prisma.rentalOrder.deleteMany();
  await prisma.gearItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}

async function main(): Promise<void> {
  await clearExistingData();
  const passwordHash = await hashPassword(SEED_PASSWORD);

  console.log('Creating users...');
  const admin = await prisma.user.create({
    data: {
      name: 'GearUp Admin',
      email: 'admin@gearup.com',
      password: passwordHash,
      role: 'ADMIN',
      phone: '01711000000',
      address: 'Gulshan, Dhaka',
    },
  });

  const provider1 = await prisma.user.create({
    data: {
      name: 'Kamal Hossain',
      email: 'provider1@gearup.com',
      password: passwordHash,
      role: 'PROVIDER',
      businessName: 'Dhaka Adventure Gear',
      bio: 'Premium outdoor and camping gear rentals, serving Dhaka since 2020.',
      phone: '01711000001',
      address: 'Dhanmondi, Dhaka',
    },
  });

  const provider2 = await prisma.user.create({
    data: {
      name: 'Farida Yasmin',
      email: 'provider2@gearup.com',
      password: passwordHash,
      role: 'PROVIDER',
      businessName: 'Chittagong Outdoor Co',
      bio: 'Sports and fitness equipment rentals for teams and individuals.',
      phone: '01711000002',
      address: 'Agrabad, Chittagong',
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      name: 'Rafiq Ahmed',
      email: 'customer1@gearup.com',
      password: passwordHash,
      role: 'CUSTOMER',
      phone: '01811000001',
      address: 'Mirpur, Dhaka',
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      name: 'Nusrat Jahan',
      email: 'customer2@gearup.com',
      password: passwordHash,
      role: 'CUSTOMER',
      phone: '01811000002',
      address: 'Panchlaish, Chittagong',
    },
  });

  console.log('Creating categories...');
  const [camping, water, winter, cycling, team, fitness] = await Promise.all([
    prisma.category.create({
      data: { name: 'Camping & Hiking', slug: 'camping-hiking', description: 'Tents, backpacks, and trekking gear.', icon: 'tent' },
    }),
    prisma.category.create({
      data: { name: 'Water Sports', slug: 'water-sports', description: 'Kayaks, snorkeling gear, and more.', icon: 'waves' },
    }),
    prisma.category.create({
      data: { name: 'Winter Sports', slug: 'winter-sports', description: 'Snowboards, skis, and cold-weather gear.', icon: 'snowflake' },
    }),
    prisma.category.create({
      data: { name: 'Cycling', slug: 'cycling', description: 'Mountain bikes, road bikes, and accessories.', icon: 'bike' },
    }),
    prisma.category.create({
      data: { name: 'Team Sports', slug: 'team-sports', description: 'Football, volleyball, and team equipment.', icon: 'trophy' },
    }),
    prisma.category.create({
      data: { name: 'Fitness & Training', slug: 'fitness-training', description: 'Home gym and personal training equipment.', icon: 'dumbbell' },
    }),
  ]);

  console.log('Creating gear items...');
  const tent4p = await prisma.gearItem.create({
    data: {
      providerId: provider1.id,
      categoryId: camping.id,
      name: '4-Person Camping Tent',
      description: 'Spacious waterproof tent, easy 15-minute setup, ideal for family camping trips or group treks in the hills.',
      brand: 'Coleman',
      images: ['https://placehold.co/600x400?text=4P+Tent'],
      pricePerDay: 450,
      securityDeposit: 2000,
      quantityTotal: 5,
      quantityAvailable: 4, // 1 reserved by seeded order #1 (PLACED)
      condition: 'GOOD',
      location: 'Dhanmondi, Dhaka',
      specifications: { capacity: '4 person', weightKg: 4.2, waterproof: true },
    },
  });

  const backpack = await prisma.gearItem.create({
    data: {
      providerId: provider1.id,
      categoryId: camping.id,
      name: 'Trekking Backpack 60L',
      description: 'Ergonomic 60-liter trekking backpack with rain cover, adjustable straps, and multiple compartments.',
      brand: 'Deuter',
      images: ['https://placehold.co/600x400?text=Backpack+60L'],
      pricePerDay: 150,
      securityDeposit: 1000,
      quantityTotal: 8,
      quantityAvailable: 6, // 2 reserved by seeded order #2 (CONFIRMED)
      condition: 'LIKE_NEW',
      location: 'Dhanmondi, Dhaka',
      specifications: { capacityLiters: 60, rainCover: true },
    },
  });

  const kayak = await prisma.gearItem.create({
    data: {
      providerId: provider1.id,
      categoryId: water.id,
      name: 'Single-Seat Kayak',
      description: 'Stable, lightweight kayak perfect for calm rivers and lakes. Paddle and life jacket included.',
      brand: 'Perception',
      images: ['https://placehold.co/600x400?text=Kayak'],
      pricePerDay: 800,
      securityDeposit: 5000,
      quantityTotal: 3,
      quantityAvailable: 3,
      condition: 'GOOD',
      location: 'Dhanmondi, Dhaka',
      specifications: { seats: 1, includesLifeJacket: true },
    },
  });

  const mountainBike = await prisma.gearItem.create({
    data: {
      providerId: provider1.id,
      categoryId: cycling.id,
      name: 'Mountain Bike - 21 Speed',
      description: 'Trail-ready mountain bike with front suspension, disc brakes, and 21-speed gearing.',
      brand: 'Trek',
      images: ['https://placehold.co/600x400?text=Mountain+Bike'],
      pricePerDay: 350,
      securityDeposit: 3000,
      quantityTotal: 4,
      quantityAvailable: 3, // 1 with seeded order #4 (PICKED_UP)
      condition: 'GOOD',
      location: 'Dhanmondi, Dhaka',
      specifications: { gears: 21, frameSize: 'M/L' },
    },
  });

  const snowboard = await prisma.gearItem.create({
    data: {
      providerId: provider1.id,
      categoryId: winter.id,
      name: 'Snowboard Set (Board + Boots)',
      description: 'All-mountain snowboard with bindings and boots, sizes available on request.',
      brand: 'Burton',
      images: ['https://placehold.co/600x400?text=Snowboard'],
      pricePerDay: 600,
      securityDeposit: 4000,
      quantityTotal: 2,
      quantityAvailable: 2, // seeded order #6 was CANCELLED, inventory released
      condition: 'FAIR',
      location: 'Dhanmondi, Dhaka',
      specifications: { includesBoots: true, includesBindings: true },
    },
  });

  const footballSet = await prisma.gearItem.create({
    data: {
      providerId: provider2.id,
      categoryId: team.id,
      name: 'Football Match Set',
      description: 'FIFA-approved match balls (x2), cones, and bibs - everything needed for a 5-a-side or 11-a-side match.',
      brand: 'Nike',
      images: ['https://placehold.co/600x400?text=Football+Set'],
      pricePerDay: 300,
      securityDeposit: 1500,
      quantityTotal: 6,
      quantityAvailable: 6, // seeded order #5 was RETURNED, inventory released
      condition: 'GOOD',
      location: 'Agrabad, Chittagong',
      specifications: { balls: 2, cones: 10, bibs: 12 },
      avgRating: 5,
      reviewCount: 1,
    },
  });

  const volleyballNet = await prisma.gearItem.create({
    data: {
      providerId: provider2.id,
      categoryId: team.id,
      name: 'Portable Volleyball Net Set',
      description: 'Quick-assembly volleyball net with poles, ground stakes, and carrying bag.',
      brand: 'Wilson',
      images: ['https://placehold.co/600x400?text=Volleyball+Net'],
      pricePerDay: 250,
      securityDeposit: 1000,
      quantityTotal: 4,
      quantityAvailable: 4,
      condition: 'GOOD',
      location: 'Agrabad, Chittagong',
      specifications: { includesBall: false, portable: true },
    },
  });

  const snorkelSet = await prisma.gearItem.create({
    data: {
      providerId: provider2.id,
      categoryId: water.id,
      name: 'Snorkeling Gear Set',
      description: 'Mask, snorkel, and fins - available in multiple sizes. Great for Saint Martin or Kuakata trips.',
      brand: 'Cressi',
      images: ['https://placehold.co/600x400?text=Snorkel+Set'],
      pricePerDay: 200,
      securityDeposit: 800,
      quantityTotal: 10,
      quantityAvailable: 7, // 3 reserved by seeded order #3 (PAID)
      condition: 'NEW',
      location: 'Agrabad, Chittagong',
      specifications: { sizes: ['S', 'M', 'L'] },
    },
  });

  const treadmill = await prisma.gearItem.create({
    data: {
      providerId: provider2.id,
      categoryId: fitness.id,
      name: 'Portable Folding Treadmill',
      description: 'Compact folding treadmill, ideal for short-term home use or events.',
      brand: 'Xterra',
      images: ['https://placehold.co/600x400?text=Treadmill'],
      pricePerDay: 500,
      securityDeposit: 3000,
      quantityTotal: 3,
      quantityAvailable: 3,
      condition: 'GOOD',
      location: 'Agrabad, Chittagong',
      specifications: { foldable: true, maxSpeedKph: 12 },
    },
  });

  const yogaKit = await prisma.gearItem.create({
    data: {
      providerId: provider2.id,
      categoryId: fitness.id,
      name: 'Yoga Mat + Accessory Kit',
      description: 'Non-slip yoga mat with blocks, strap, and carrying bag.',
      brand: 'Liforme',
      images: ['https://placehold.co/600x400?text=Yoga+Kit'],
      pricePerDay: 80,
      securityDeposit: 200,
      quantityTotal: 15,
      quantityAvailable: 13, // 2 reserved by seeded order #3 (PAID)
      condition: 'LIKE_NEW',
      location: 'Agrabad, Chittagong',
      specifications: { includesBlocks: true, includesStrap: true },
    },
  });

  await prisma.gearItem.create({
    data: {
      providerId: provider2.id,
      categoryId: cycling.id,
      name: 'Road Bike - Carbon Frame',
      description: 'Lightweight carbon-frame road bike, great for long-distance rides.',
      brand: 'Giant',
      images: ['https://placehold.co/600x400?text=Road+Bike'],
      pricePerDay: 400,
      securityDeposit: 3500,
      quantityTotal: 3,
      quantityAvailable: 3,
      condition: 'GOOD',
      location: 'Agrabad, Chittagong',
      specifications: { frameMaterial: 'carbon', gears: 18 },
    },
  });

  await prisma.gearItem.create({
    data: {
      providerId: provider2.id,
      categoryId: camping.id,
      name: '2-Person Camping Tent',
      description: 'Lightweight backpacking tent for two, quick pitch, great for solo trekkers or couples.',
      brand: 'Naturehike',
      images: ['https://placehold.co/600x400?text=2P+Tent'],
      pricePerDay: 300,
      securityDeposit: 1500,
      quantityTotal: 6,
      quantityAvailable: 6,
      condition: 'NEW',
      location: 'Agrabad, Chittagong',
      specifications: { capacity: '2 person', weightKg: 2.1 },
    },
  });

  console.log('Creating rental orders across every lifecycle state...');

  // --- Order 1: PLACED (awaiting provider confirmation) ---
  await prisma.rentalOrder.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId: customer1.id,
      providerId: provider1.id,
      status: 'PLACED',
      startDate: daysFromNow(3),
      endDate: daysFromNow(6),
      totalDays: 3,
      subtotal: 1350,
      depositTotal: 2000,
      totalAmount: 3350,
      deliveryAddress: 'Mirpur, Dhaka',
      items: {
        create: [{ gearItemId: tent4p.id, quantity: 1, pricePerDay: 450, days: 3, lineTotal: 1350 }],
      },
    },
  });

  // --- Order 2: CONFIRMED (awaiting payment) ---
  await prisma.rentalOrder.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId: customer2.id,
      providerId: provider1.id,
      status: 'CONFIRMED',
      startDate: daysFromNow(5),
      endDate: daysFromNow(8),
      totalDays: 3,
      subtotal: 900,
      depositTotal: 2000,
      totalAmount: 2900,
      confirmedAt: new Date(),
      deliveryAddress: 'Panchlaish, Chittagong',
      items: {
        create: [{ gearItemId: backpack.id, quantity: 2, pricePerDay: 150, days: 3, lineTotal: 900 }],
      },
    },
  });

  // --- Order 3: PAID (awaiting pickup) ---
  const order3 = await prisma.rentalOrder.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId: customer1.id,
      providerId: provider2.id,
      status: 'PAID',
      startDate: daysFromNow(1),
      endDate: daysFromNow(4),
      totalDays: 3,
      subtotal: 2280,
      depositTotal: 2800,
      totalAmount: 5080,
      confirmedAt: new Date(Date.now() - 2 * DAY_MS),
      paidAt: new Date(Date.now() - DAY_MS),
      deliveryAddress: 'Mirpur, Dhaka',
      items: {
        create: [
          { gearItemId: snorkelSet.id, quantity: 3, pricePerDay: 200, days: 3, lineTotal: 1800 },
          { gearItemId: yogaKit.id, quantity: 2, pricePerDay: 80, days: 3, lineTotal: 480 },
        ],
      },
    },
  });

  // --- Order 4: PICKED_UP (gear currently with the customer) ---
  const order4 = await prisma.rentalOrder.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId: customer2.id,
      providerId: provider1.id,
      status: 'PICKED_UP',
      startDate: daysFromNow(-1),
      endDate: daysFromNow(2),
      totalDays: 3,
      subtotal: 1050,
      depositTotal: 3000,
      totalAmount: 4050,
      confirmedAt: new Date(Date.now() - 3 * DAY_MS),
      paidAt: new Date(Date.now() - 2 * DAY_MS),
      pickedUpAt: new Date(Date.now() - DAY_MS),
      deliveryAddress: 'Panchlaish, Chittagong',
      items: {
        create: [{ gearItemId: mountainBike.id, quantity: 1, pricePerDay: 350, days: 3, lineTotal: 1050 }],
      },
    },
  });

  // --- Order 5: RETURNED (completed, reviewed) ---
  const order5 = await prisma.rentalOrder.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId: customer1.id,
      providerId: provider2.id,
      status: 'RETURNED',
      startDate: daysFromNow(-10),
      endDate: daysFromNow(-7),
      totalDays: 3,
      subtotal: 1800,
      depositTotal: 3000,
      totalAmount: 4800,
      confirmedAt: new Date(Date.now() - 11 * DAY_MS),
      paidAt: new Date(Date.now() - 10 * DAY_MS),
      pickedUpAt: new Date(Date.now() - 10 * DAY_MS),
      returnedAt: new Date(Date.now() - 7 * DAY_MS),
      deliveryAddress: 'Mirpur, Dhaka',
      items: {
        create: [{ gearItemId: footballSet.id, quantity: 2, pricePerDay: 300, days: 3, lineTotal: 1800 }],
      },
    },
  });

  // --- Order 6: CANCELLED (customer cancelled before confirmation) ---
  await prisma.rentalOrder.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId: customer2.id,
      providerId: provider1.id,
      status: 'CANCELLED',
      startDate: daysFromNow(10),
      endDate: daysFromNow(13),
      totalDays: 3,
      subtotal: 1800,
      depositTotal: 4000,
      totalAmount: 5800,
      cancelledAt: new Date(),
      cancelReason: 'Change of travel plans',
      deliveryAddress: 'Panchlaish, Chittagong',
      items: {
        create: [{ gearItemId: snowboard.id, quantity: 1, pricePerDay: 600, days: 3, lineTotal: 1800 }],
      },
    },
  });

  console.log('Creating payments...');
  await prisma.payment.create({
    data: {
      transactionId: generateTransactionId(),
      rentalOrderId: order3.id,
      customerId: customer1.id,
      provider: 'SSLCOMMERZ',
      method: 'Mobile Banking - bKash',
      amount: order3.totalAmount,
      currency: 'BDT',
      status: 'COMPLETED',
      gatewayValId: 'SEED0000000000VAL003',
      gatewayBankTranId: 'SEED0000BANK003',
      cardType: 'bKash',
      paidAt: new Date(Date.now() - DAY_MS),
    },
  });

  await prisma.payment.create({
    data: {
      transactionId: generateTransactionId(),
      rentalOrderId: order4.id,
      customerId: customer2.id,
      provider: 'SSLCOMMERZ',
      method: 'Card',
      amount: order4.totalAmount,
      currency: 'BDT',
      status: 'COMPLETED',
      gatewayValId: 'SEED0000000000VAL004',
      gatewayBankTranId: 'SEED0000BANK004',
      cardType: 'VISA',
      paidAt: new Date(Date.now() - 2 * DAY_MS),
    },
  });

  await prisma.payment.create({
    data: {
      transactionId: generateTransactionId(),
      rentalOrderId: order5.id,
      customerId: customer1.id,
      provider: 'SSLCOMMERZ',
      method: 'Mobile Banking - Nagad',
      amount: order5.totalAmount,
      currency: 'BDT',
      status: 'COMPLETED',
      gatewayValId: 'SEED0000000000VAL005',
      gatewayBankTranId: 'SEED0000BANK005',
      cardType: 'Nagad',
      paidAt: new Date(Date.now() - 10 * DAY_MS),
    },
  });

  console.log('Creating a review for the returned order...');
  await prisma.review.create({
    data: {
      customerId: customer1.id,
      gearItemId: footballSet.id,
      rentalOrderId: order5.id,
      rating: 5,
      comment: 'Great condition balls and the cone set made setting up practice really easy. Would rent again!',
    },
  });

  console.log('\nSeed complete.\n');
  console.log('Login credentials (all use the same password for convenience):');
  console.log(`  Password for every account: ${SEED_PASSWORD}\n`);
  console.log(`  Admin:      ${admin.email}`);
  console.log(`  Provider 1: ${provider1.email}  (Dhaka Adventure Gear)`);
  console.log(`  Provider 2: ${provider2.email}  (Chittagong Outdoor Co)`);
  console.log(`  Customer 1: ${customer1.email}  (Rafiq Ahmed)`);
  console.log(`  Customer 2: ${customer2.email}  (Nusrat Jahan)`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
