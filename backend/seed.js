const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('./models/User');
const FoodListing = require('./models/FoodListing');
const NGORequirement = require('./models/NGORequirement');
const WasteHistory = require('./models/WasteHistory');
const Notification = require('./models/Notification');
const { calculateRedistributionPriority } = require('./utils/redistributionPriority');
const { connectToDatabase } = require('./utils/db');

dotenv.config();
const point = (longitude, latitude) => ({ type: 'Point', coordinates: [longitude, latitude] });
const users = [
  { name: 'Green Spoon Kitchen', email: 'restaurant@foodbridge.com', role: 'restaurant', organizationName: 'Green Spoon Kitchen', phone: '9876543210', address: '12 Market Road', location: point(77.5946, 12.9716), isVerified: true },
  { name: 'Hope Hands NGO', email: 'ngo@foodbridge.com', role: 'ngo', organizationName: 'Hope Hands', phone: '9000000001', address: '18 Community Street', location: point(77.599, 12.968), isVerified: true },
  { name: 'Sunrise Dairy Farm', email: 'animal@foodbridge.com', role: 'animal_husbandry', organizationName: 'Sunrise Dairy Farm', animalType: 'cow', phone: '9000000002', address: '22 Farm Track', location: point(77.601, 12.975), isVerified: true },
  { name: 'BioLoop Industries', email: 'industry@foodbridge.com', role: 'industry', organizationName: 'BioLoop Industries', industryType: 'biogas', phone: '9000000003', address: '45 Industrial Avenue', location: point(77.61, 12.98), isVerified: true },
  { name: 'Platform Admin', email: 'admin@foodbridge.com', role: 'admin', organizationName: 'FoodBridge Admin', phone: '9000000004', address: 'HQ', location: point(77.58, 12.97), isVerified: true }
];

const run = async () => {
  try {
    await connectToDatabase(mongoose);
    const previousDemoUsers = await User.find({ email: { $in: users.map((user) => user.email) } }).select('_id role');
    const previousIds = previousDemoUsers.map((user) => user._id);
    const previousRestaurantIds = previousDemoUsers.filter((user) => user.role === 'restaurant').map((user) => user._id);
    const previousNgoIds = previousDemoUsers.filter((user) => user.role === 'ngo').map((user) => user._id);
    const previousListingIds = (await FoodListing.find({ restaurantId: { $in: previousRestaurantIds } }).select('_id')).map((item) => item._id);
    await Promise.all([
      FoodListing.deleteMany({ restaurantId: { $in: previousRestaurantIds } }),
      NGORequirement.deleteMany({ ngo: { $in: previousNgoIds } }),
      WasteHistory.deleteMany({ restaurantId: { $in: previousRestaurantIds } }),
      Notification.deleteMany({ $or: [{ recipientId: { $in: previousIds } }, { foodListingId: { $in: previousListingIds } }] }),
      User.deleteMany({ _id: { $in: previousIds } })
    ]);
    const createdUsers = [];
    for (const user of users) createdUsers.push(await User.create({ ...user, password: await bcrypt.hash('password123', 10) }));
    const restaurant = createdUsers.find((user) => user.role === 'restaurant');
    const ngo = createdUsers.find((user) => user.role === 'ngo');
    const animalRecipient = createdUsers.find((user) => user.role === 'animal_husbandry');
    const industryRecipient = createdUsers.find((user) => user.role === 'industry');
    const requirement = await NGORequirement.create({ ngo: ngo._id, foodType: 'cooked', quantityRequired: 50, quantityFulfilled: 0, quantityUnit: 'portions', location: ngo.location, status: 'active' });
    const bakeryRequirement = await NGORequirement.create({ ngo: ngo._id, foodType: 'bakery', quantityRequired: 20, quantityFulfilled: 0, quantityUnit: 'boxes', location: ngo.location, status: 'active' });

    const now = Date.now();
    const specs = [
      { foodName: 'Prepared Meal Portions', foodType: 'cooked', quantity: 40, quantityUnit: 'portions', recipient: 'human', hoursOld: 24, location: point(77.596, 12.971), pickupHours: 0 },
      { foodName: 'Cooked Rice Trays', foodType: 'cooked', quantity: 55, quantityUnit: 'portions', recipient: 'human', hoursOld: 11, location: point(77.601, 12.972), pickupHours: 0 },
      { foodName: 'Bakery Boxes', foodType: 'bakery', quantity: 8, quantityUnit: 'boxes', recipient: 'human', hoursOld: 8, location: point(77.64, 13.02), pickupHours: 0 },
      { foodName: 'Fresh Fruit Crates', foodType: 'raw', quantity: 3, quantityUnit: 'boxes', recipient: 'human', hoursOld: 0.1, location: point(77.9, 13.2), pickupHours: 8 },
      { foodName: 'Donor-Declared Animal Feed Batch', foodType: 'raw', quantity: 25, quantityUnit: 'kg', recipient: 'animal', hoursOld: 6, location: point(77.598, 12.973), pickupHours: 0 },
      { foodName: 'Donor-Declared Composting Material', foodType: 'mixed', quantity: 60, quantityUnit: 'kg', recipient: 'industry', hoursOld: 3, location: point(77.61, 12.98), pickupHours: 1 }
    ];
    const intended = { human: ngo, animal: animalRecipient, industry: industryRecipient };
    const listings = [];
    for (const spec of specs) {
      const createdAt = new Date(now - spec.hoursOld * 60 * 60 * 1000);
      const listing = new FoodListing({
        restaurantId: restaurant._id, restaurantName: restaurant.organizationName, restaurantLocation: spec.location,
        foodName: spec.foodName, foodType: spec.foodType, foodCategory: 'veg', quantity: spec.quantity, quantityUnit: spec.quantityUnit,
        description: 'Demo donation. Intended use was selected by the donor.', intendedRecipientType: spec.recipient,
        pickupAvailableFrom: new Date(now + spec.pickupHours * 60 * 60 * 1000), createdAt, updatedAt: createdAt
      });
      const requirements = spec.recipient === 'human' ? [requirement.toObject(), bakeryRequirement.toObject()] : [];
      Object.assign(listing, calculateRedistributionPriority({ listing, requirements, recipients: [intended[spec.recipient]], now: new Date() }));
      listings.push(listing);
    }
    await FoodListing.insertMany(listings);

    const historyEntries = Array.from({ length: 42 }).map((_, index) => {
      const date = new Date(); date.setDate(date.getDate() - index);
      return { restaurantId: restaurant._id, date, dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }), foodItems: [{ foodName: 'Rice Bowl', foodType: 'cooked', quantityPrepared: 30, quantityWasted: 4 + index % 4, quantityClaimed: 15 + index % 3 }], totalWasted: 6 + index % 5, totalClaimed: 18 + index % 7, specialEvent: index % 10 === 0 };
    });
    await WasteHistory.insertMany(historyEntries);
    await Notification.insertMany([{ recipientId: ngo._id, recipientRole: 'ngo', type: 'new_relevant_donation', message: 'A high-priority prepared meal donation matches your active requirement.', foodListingId: listings[0]._id }]);
    console.log('FoodBridge redistribution demo data created successfully');
  } catch (error) { console.error('Seed failed', error); process.exitCode = 1; }
  finally { await mongoose.connection.close(); }
};
run();
