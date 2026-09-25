const cron = require('node-cron');
const FoodListing = require('../models/FoodListing');
const NGORequirement = require('../models/NGORequirement');
const User = require('../models/User');
const { calculateRedistributionPriority } = require('./redistributionPriority');
const { createNotification, emitToRoleRoom } = require('./notificationService');

const ROLE_BY_INTENT = { human: 'ngo', animal: 'animal_husbandry', industry: 'industry' };
const ROOM_BY_INTENT = { human: 'ngo-room', animal: 'animal-room', industry: 'industry-room' };

const startPriorityCron = () => cron.schedule('*/15 * * * *', async () => {
  try {
    const listings = await FoodListing.find({ status: 'available' });
    for (const listing of listings) {
      const role = ROLE_BY_INTENT[listing.intendedRecipientType];
      const [recipients, requirements] = await Promise.all([
        User.find({ role }).select('location'),
        listing.intendedRecipientType === 'human' ? NGORequirement.find({ status: 'active' }).lean() : []
      ]);
      const previousScore = Number(listing.priorityScore || 0);
      const previousUrgency = listing.urgencyLevel;
      const result = calculateRedistributionPriority({ listing, recipients, requirements });
      listing.priorityScore = result.priorityScore;
      listing.urgencyLevel = result.urgencyLevel;
      listing.priorityFactors = result.priorityFactors;
      await listing.save();

      const meaningfullyChanged = previousUrgency !== listing.urgencyLevel || Math.abs(previousScore - listing.priorityScore) >= 10;
      if (!meaningfullyChanged) continue;
      emitToRoleRoom(ROOM_BY_INTENT[listing.intendedRecipientType], { action: 'priority_changed', event: listing.priorityScore > previousScore ? 'PRIORITY_INCREASED' : 'PRIORITY_UPDATED', listingId: listing._id, priorityScore: listing.priorityScore, urgencyLevel: listing.urgencyLevel });
      if (listing.priorityScore > previousScore) {
        const relevant = listing.intendedRecipientType === 'human'
          ? recipients.filter((recipient) => requirements.some((requirement) => String(requirement.ngo) === String(recipient._id) && requirement.status === 'active' && requirement.foodType === listing.foodType && requirement.quantityUnit === listing.quantityUnit))
          : recipients;
        await Promise.all(relevant.map((recipient) => createNotification({
          recipientId: recipient._id, recipientRole: role, type: 'priority_increased',
          message: `${listing.urgencyLevel} priority donation matches your organization type${result.priorityFactors.nearestDistanceKm == null ? '' : ` ${result.priorityFactors.nearestDistanceKm} km away`}.`,
          foodListingId: listing._id
        })));
      }
    }
  } catch (error) {
    console.error('Redistribution priority recalculation failed:', error);
  }
});

module.exports = { startPriorityCron };
