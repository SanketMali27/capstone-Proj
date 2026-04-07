const cron = require('node-cron');
const FoodListing = require('../models/FoodListing');
const User = require('../models/User');
const { calculateSafetyScore } = require('./safetyModel');
const { createNotification, emitToRoleRoom } = require('./notificationService');

const CATEGORY_TO_ROOM = {
  human: 'ngo-room',
  animal: 'animal-room',
  industry: 'industry-room'
};

const notifyRoleUsers = async (role, message, foodListingId) => {
  const users = await User.find({ role }).select('_id role');
  await Promise.all(
    users.map((user) =>
      createNotification({
        recipientId: user._id,
        recipientRole: user.role,
        type: 'category_downgrade',
        message,
        foodListingId
      })
    )
  );
};

const startAutoDowngradeCron = () => {
  cron.schedule('*/15 * * * *', async () => {
    const listings = await FoodListing.find({ status: 'available' });

    await Promise.all(
      listings.map(async (listing) => {
        const previousCategory = listing.currentCategory;
        const safetyData = calculateSafetyScore(listing.toObject(), new Date());

        listing.safetyScore = safetyData.safetyScore;
        listing.currentCategory = safetyData.currentCategory;
        listing.predictedExpiryTime = safetyData.predictedExpiryTime;
        listing.humanExpiryTime = safetyData.humanExpiryTime;
        listing.animalExpiryTime = safetyData.animalExpiryTime;
        listing.safeConsumptionWindowHours = safetyData.safeConsumptionWindowHours;

        if (safetyData.safetyScore === 0) {
          listing.status = 'expired';
          listing.currentCategory = 'expired';
          await listing.save();

          await createNotification({
            recipientId: listing.restaurantId,
            recipientRole: 'restaurant',
            type: 'expiry_warning',
            message: `${listing.foodName} has expired and is no longer visible to receivers.`,
            foodListingId: listing._id
          });

          emitToRoleRoom('ngo-room', { foodListingId: listing._id, action: 'expired' });
          emitToRoleRoom('animal-room', { foodListingId: listing._id, action: 'expired' });
          emitToRoleRoom('industry-room', { foodListingId: listing._id, action: 'expired' });
          return;
        }

        if (previousCategory !== listing.currentCategory) {
          await listing.save();

          if (listing.currentCategory === 'animal') {
            await notifyRoleUsers(
              'animal_husbandry',
              `${listing.foodName} has been downgraded and is now available for animal use.`,
              listing._id
            );
          }

          if (listing.currentCategory === 'industry') {
            await notifyRoleUsers(
              'industry',
              `${listing.foodName} is now available for industrial use.`,
              listing._id
            );
          }

          const previousRoom = CATEGORY_TO_ROOM[previousCategory];
          const nextRoom = CATEGORY_TO_ROOM[listing.currentCategory];

          if (previousRoom) {
            emitToRoleRoom(previousRoom, {
              foodListingId: listing._id,
              action: 'remove',
              category: previousCategory
            });
          }

          if (nextRoom) {
            emitToRoleRoom(nextRoom, {
              foodListingId: listing._id,
              action: 'add',
              category: listing.currentCategory
            });
          }

          return;
        }

        await listing.save();
      })
    );
  });
};

module.exports = {
  startAutoDowngradeCron
};

