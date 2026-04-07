const User = require('../models/User');

const ROLE_ROOMS = {
  human: 'ngo',
  animal: 'animal_husbandry',
  industry: 'industry'
};

const getRelevantRolesForCategory = (category) => {
  const role = ROLE_ROOMS[category];
  return role ? [role] : [];
};

const findNearbyUsers = async (location, roles, maxDistance = 10000, limit = 5) => {
  if (!location?.coordinates?.length || !roles.length) {
    return [];
  }

  return User.find({
    role: { $in: roles },
    location: {
      $near: {
        $geometry: location,
        $maxDistance: maxDistance
      }
    }
  })
    .select('-password')
    .limit(limit);
};

module.exports = {
  getRelevantRolesForCategory,
  findNearbyUsers
};

