const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('./models/User');
const FoodListing = require('./models/FoodListing');
const WasteHistory = require('./models/WasteHistory');
const Notification = require('./models/Notification');
const { calculateSafetyScore } = require('./utils/safetyModel');

dotenv.config();

const sampleLocation = (longitude, latitude) => ({
  type: 'Point',
  coordinates: [longitude, latitude]
});

const users = [
  {
    name: 'Green Spoon Kitchen',
    email: 'restaurant@foodbridge.com',
    password: 'password123',
    role: 'restaurant',
    organizationName: 'Green Spoon Kitchen',
    phone: '9876543210',
    address: '12 Market Road',
    isVerified: true,
    location: sampleLocation(77.5946, 12.9716)
  },
  {
    name: 'Hope Hands NGO',
    email: 'ngo@foodbridge.com',
    password: 'password123',
    role: 'ngo',
    organizationName: 'Hope Hands',
    phone: '9000000001',
    address: '18 Community Street',
    isVerified: true,
    location: sampleLocation(77.599, 12.968)
  },
  {
    name: 'Sunrise Dairy Farm',
    email: 'animal@foodbridge.com',
    password: 'password123',
    role: 'animal_husbandry',
    organizationName: 'Sunrise Dairy Farm',
    animalType: 'cow',
    phone: '9000000002',
    address: '22 Farm Track',
    isVerified: true,
    location: sampleLocation(77.601, 12.975)
  },
  {
    name: 'BioLoop Industries',
    email: 'industry@foodbridge.com',
    password: 'password123',
    role: 'industry',
    organizationName: 'BioLoop Industries',
    industryType: 'biogas',
    phone: '9000000003',
    address: '45 Industrial Avenue',
    isVerified: true,
    location: sampleLocation(77.61, 12.98)
  },
  {
    name: 'Platform Admin',
    email: 'admin@foodbridge.com',
    password: 'password123',
    role: 'admin',
    organizationName: 'FoodBridge Admin',
    phone: '9000000004',
    address: 'HQ',
    isVerified: true,
    location: sampleLocation(77.58, 12.97)
  }
];

const seasons = ['summer', 'winter', 'monsoon', 'spring'];
const foodTypes = ['cooked', 'dairy', 'bakery', 'packaged', 'raw'];
const foodNames = ['Rice Bowl', 'Mixed Bread', 'Milk Packs', 'Fresh Salad', 'Cooked Pasta', 'Fruit Crate'];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Promise.all([User.deleteMany({}), FoodListing.deleteMany({}), WasteHistory.deleteMany({}), Notification.deleteMany({})]);

    const createdUsers = [];
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      createdUsers.push(await User.create({ ...user, password: hashedPassword }));
    }

    const restaurant = createdUsers.find((user) => user.role === 'restaurant');

    const listings = [];
    for (let index = 0; index < 8; index += 1) {
      const preparedAt = new Date(Date.now() - (index + 1) * 60 * 60 * 1000);
      const foodType = foodTypes[index % foodTypes.length];
      const season = seasons[index % seasons.length];
      const safety = calculateSafetyScore(
        {
          foodType,
          storageTemperature: 18 + index * 2,
          humidity: 45 + index * 5,
          preparedAt,
          season
        },
        new Date()
      );

      listings.push({
        restaurantId: restaurant._id,
        restaurantName: restaurant.organizationName,
        restaurantLocation: restaurant.location,
        foodName: `${foodNames[index % foodNames.length]} ${index + 1}`,
        foodType,
        foodCategory: index % 2 === 0 ? 'veg' : 'non-veg',
        quantity: 5 + index,
        quantityUnit: 'kg',
        preparedAt,
        storageTemperature: 18 + index * 2,
        humidity: 45 + index * 5,
        season,
        description: 'Seeded sample listing for FoodBridge demo',
        safetyScore: safety.safetyScore,
        predictedExpiryTime: safety.predictedExpiryTime,
        safeConsumptionWindowHours: safety.safeConsumptionWindowHours,
        currentCategory: safety.currentCategory,
        humanExpiryTime: safety.humanExpiryTime,
        animalExpiryTime: safety.animalExpiryTime,
        status: safety.currentCategory === 'expired' ? 'expired' : 'available'
      });
    }

    await FoodListing.insertMany(listings);

    const historyEntries = Array.from({ length: 42 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - index);
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

      return {
        restaurantId: restaurant._id,
        date,
        dayOfWeek,
        season: seasons[index % seasons.length],
        foodItems: [
          {
            foodName: 'Rice Bowl',
            foodType: 'cooked',
            quantityPrepared: 30,
            quantityWasted: 4 + (index % 4),
            quantityClaimed: 15 + (index % 3)
          },
          {
            foodName: 'Milk Packs',
            foodType: 'dairy',
            quantityPrepared: 18,
            quantityWasted: 2 + (index % 2),
            quantityClaimed: 8 + (index % 4)
          }
        ],
        totalWasted: 6 + (index % 5),
        totalClaimed: 18 + (index % 7),
        weatherCondition: index % 3 === 0 ? 'Cloudy' : 'Sunny',
        specialEvent: index % 10 === 0
      };
    });

    await WasteHistory.insertMany(historyEntries);
    console.log('FoodBridge seed data created successfully');
  } catch (error) {
    console.error('Seed failed', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();

