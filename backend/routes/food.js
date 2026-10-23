const express = require('express');
const multer = require('multer');
const path = require('path');

const FoodListing = require('../models/FoodListing');
const NGORequirement = require('../models/NGORequirement');
const User = require('../models/User');
const WasteHistory = require('../models/WasteHistory');

const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const {
  calculateRedistributionPriority,
  calculatePersonalizedScore,
  normalizePreferences,
  DEFAULT_PREFERENCES,
  haversineKm,
} = require('../utils/redistributionPriority');

const {
  createNotification,
  emitToRoleRoom,
} = require('../utils/notificationService');

const router = express.Router();

// Keep stale surplus off recipient feeds and expire any outstanding request
// after one day. Donors can use a shorter pickup window when needed.
const MAX_LISTING_AGE_MS = 24 * 60 * 60 * 1000;

const expireStaleListings = async () => {
  const now = new Date();
  const ageCutoff = new Date(now.getTime() - MAX_LISTING_AGE_MS);
  await FoodListing.updateMany(
    {
      status: { $in: ['available', 'requested', 'claimed', 'pickup_pending'] },
      $or: [
        { createdAt: { $lte: ageCutoff } },
        { pickupAvailableUntil: { $ne: null, $lte: now } },
      ],
    },
    { $set: { status: 'cancelled', cancelledAt: now, expiredAt: now } }
  );
};

/**
 * ============================================================================
 * FILE UPLOAD CONFIGURATION
 * ============================================================================
 */

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },

  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '-');

    cb(
      null,
      `${Date.now()}-${safeName}`
    );
  },
});

const upload = multer({ storage });

/**
 * ============================================================================
 * RECIPIENT INTENT MAPPING
 * ============================================================================
 *
 * human   -> NGO / human redistribution
 * animal  -> Animal Husbandry
 * industry -> Industry
 *
 * IMPORTANT:
 * These are donor-declared intended uses.
 *
 * There is NO automatic food-safety downgrade.
 * There is NO safety score used to move food from human -> animal -> industry.
 * ============================================================================
 */

const roleByIntent = {
  human: 'ngo',
  animal: 'animal_husbandry',
  industry: 'industry',
};

const roomByIntent = {
  human: 'ngo-room',
  animal: 'animal-room',
  industry: 'industry-room',
};

const intentByRole = {
  ngo: 'human',
  animal_husbandry: 'animal',
  industry: 'industry',
};

const VALID_INTENTS = Object.keys(roleByIntent);

/**
 * ============================================================================
 * ACTIVE WAITING STATUSES
 * ============================================================================
 *
 * Waiting time keeps increasing only while the donation is operationally
 * active.
 *
 * Once the donation is completed or cancelled, the live waiting timer stops.
 * ============================================================================
 */

const ACTIVE_WAITING_STATUSES = [
  'available',
  'requested',
  'claimed',
  'pickup_pending',
];

/**
 * ============================================================================
 * WAITING TIME CALCULATION
 * ============================================================================
 *
 * ACTIVE:
 *   now - createdAt
 *
 * COMPLETED:
 *   completedAt - createdAt
 *
 * CANCELLED:
 *   No active waiting timer.
 *
 * This fixes the issue where a completed donation continued displaying:
 *
 * "Waiting: 1d 4h 47m"
 *
 * as if it were still active.
 * ============================================================================
 */

const getWaitingMetadata = (listing) => {
  const createdAt = listing.createdAt
    ? new Date(listing.createdAt)
    : new Date();

  const status = String(
    listing.status || ''
  ).toLowerCase();

  const waitingIsActive =
    ACTIVE_WAITING_STATUSES.includes(status);

  let waitingEndedAt = null;

  if (!waitingIsActive) {
    if (listing.completedAt) {
      waitingEndedAt = new Date(
        listing.completedAt
      );
    } else if (listing.pickedUpAt) {
      waitingEndedAt = new Date(
        listing.pickedUpAt
      );
    }
  }

  const endTime = waitingIsActive
    ? new Date()
    : waitingEndedAt;

  const durationMs = endTime
    ? Math.max(
      0,
      endTime.getTime() -
      createdAt.getTime()
    )
    : 0;

  return {
    waitingIsActive,

    waitingStartedAt: createdAt,

    waitingEndedAt,

    waitingDurationMinutes: Math.floor(
      durationMs / 60000
    ),
  };
};

/**
 * ============================================================================
 * SERIALIZE LISTING
 * ============================================================================
 *
 * Adds:
 *
 * distanceKm
 * waitingIsActive
 * waitingStartedAt
 * waitingEndedAt
 * waitingDurationMinutes
 *
 * The frontend can use waitingIsActive to decide whether to show:
 *
 * "Waiting: 4h 20m"
 *
 * or:
 *
 * "Total wait: 1d 4h 47m"
 * ============================================================================
 */

const serializeListing = (
  listing,
  viewerLocation = null,
  personalData = null
) => {
  const data = listing.toObject
    ? listing.toObject()
    : {
      ...listing,
    };

  const waiting =
    getWaitingMetadata(data);

  const distance = viewerLocation
    ? haversineKm(
      viewerLocation,
      data.restaurantLocation
    )
    : null;

  const distanceKm =
    personalData?.personalFactors?.distanceKm !== undefined
      ? personalData.personalFactors.distanceKm
      : distance === null
        ? null
        : Number(distance.toFixed(2));

  const restaurantObj =
    data.restaurantId && typeof data.restaurantId === 'object'
      ? data.restaurantId
      : null;

  const claimedByObj =
    data.claimedBy && typeof data.claimedBy === 'object'
      ? data.claimedBy
      : null;

  return {
    ...data,
    restaurantName:
      restaurantObj?.organizationName ||
      restaurantObj?.name ||
      data.restaurantName,
    restaurantAddress:
      restaurantObj?.address ||
      data.restaurantAddress ||
      '',
    restaurantPhone:
      restaurantObj?.phone ||
      data.restaurantPhone ||
      '',
    claimedByName:
      claimedByObj?.organizationName ||
      claimedByObj?.name ||
      '',
    claimedByPhone:
      claimedByObj?.phone ||
      '',
    distanceKm,
    personalScore:
      personalData?.personalScore !== undefined
        ? personalData.personalScore
        : null,
    personalFactors:
      personalData?.personalFactors ||
      null,
    appliedWeights:
      personalData?.appliedWeights ||
      null,
    ...waiting,
  };
};

/**
 * ============================================================================
 * RECALCULATE REDISTRIBUTION PRIORITY
 * ============================================================================
 *
 * Priority is operational only.
 *
 * It can consider:
 *
 * - waiting time
 * - demand match
 * - distance
 * - quantity
 * - pickup availability
 *
 * It does NOT calculate food safety.
 * ============================================================================
 */

const recalculatePriority = async (
  listing
) => {
  const intendedRecipientType =
    listing.intendedRecipientType;

  const recipientRole =
    roleByIntent[
    intendedRecipientType
    ];

  if (!recipientRole) {
    throw new Error(
      'Invalid intended recipient type'
    );
  }

  const recipients =
    await User.find({
      role: recipientRole,
    }).select('location');

  const requirements =
    intendedRecipientType === 'human'
      ? await NGORequirement.find({
        status: 'active',
      }).lean()
      : [];

  const priority =
    calculateRedistributionPriority({
      listing,
      requirements,
      recipients,
    });

  Object.assign(
    listing,
    priority
  );

  return listing;
};

/**
 * ============================================================================
 * GET MY REQUESTED / CLAIMED / COMPLETED DONATIONS
 * ============================================================================
 */

router.get(
  '/claimed/mine',
  auth,
  roleCheck(
    'ngo',
    'animal_husbandry',
    'industry'
  ),
  async (req, res) => {
    try {
      const listings =
        await FoodListing.find({
          claimedBy: req.user._id,

          status: {
            $in: [
              'requested',
              'claimed',
              'pickup_pending',
              'completed',
            ],
          },
        })
          .populate('restaurantId', 'name organizationName phone address location')
          .populate('claimedBy', 'name organizationName role phone')
          .sort({
            requestedAt: -1,
          });

      const data = listings.map(
        (listing) =>
          serializeListing(
            listing,
            req.user.location
          )
      );

      return res.json({
        success: true,
        data,
        message:
          'Requested donations fetched successfully',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        data: [],
        message:
          error.message ||
          'Failed to fetch requested donations',
      });
    }
  }
);

/**
 * ============================================================================
 * RECIPIENT PRIORITY PREFERENCES
 * ============================================================================
 */

router.get(
  '/preferences',
  auth,
  roleCheck('ngo', 'animal_husbandry', 'industry'),
  async (req, res) => {
    try {
      const preferences = req.user.priorityPreferences || DEFAULT_PREFERENCES;
      const normalized = normalizePreferences(preferences);

      return res.json({
        success: true,
        data: {
          preferences: normalized,
          rawPreferences: preferences,
          defaultPreferences: DEFAULT_PREFERENCES,
        },
        message: 'Priority preferences fetched successfully',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        data: {},
        message:
          error.message ||
          'Failed to fetch priority preferences',
      });
    }
  }
);

router.put(
  '/preferences',
  auth,
  roleCheck('ngo', 'animal_husbandry', 'industry'),
  async (req, res) => {
    try {
      const { preferences, reset } = req.body;
      let updatedPreferences;

      if (reset) {
        updatedPreferences = { ...DEFAULT_PREFERENCES };
      } else {
        if (!preferences || typeof preferences !== 'object') {
          return res.status(400).json({
            success: false,
            data: {},
            message: 'Invalid preferences payload provided',
          });
        }
        updatedPreferences = normalizePreferences(preferences);
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { priorityPreferences: updatedPreferences } },
        { new: true, runValidators: true }
      ).select('-password');

      return res.json({
        success: true,
        data: {
          preferences: updatedUser.priorityPreferences,
          defaultPreferences: DEFAULT_PREFERENCES,
        },
        message: reset
          ? 'Restored default priority preferences'
          : 'Priority preferences saved and normalized to 100%',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        data: {},
        message:
          error.message ||
          'Failed to update priority preferences',
      });
    }
  }
);

/**
 * ============================================================================
 * CREATE DONATION
 * ============================================================================
 */

router.post(
  '/',
  auth,
  roleCheck('restaurant'),
  upload.array('images', 5),
  async (req, res) => {
    try {
      const payload =
        req.body;

      const intendedRecipientType =
        payload.intendedRecipientType ||
        'human';

      if (
        !VALID_INTENTS.includes(
          intendedRecipientType
        )
      ) {
        return res.status(400).json({
          success: false,
          data: {},
          message:
            'Choose a valid intended recipient type',
        });
      }

      const now = new Date();
      const pickupFrom = payload.pickupAvailableFrom
        ? new Date(payload.pickupAvailableFrom)
        : now;
      const pickupUntil = payload.pickupAvailableUntil
        ? new Date(payload.pickupAvailableUntil)
        : null;

      if (
        Number.isNaN(pickupFrom.getTime()) ||
        pickupFrom > new Date(now.getTime() + MAX_LISTING_AGE_MS) ||
        (pickupUntil && (
          Number.isNaN(pickupUntil.getTime()) ||
          pickupUntil <= pickupFrom ||
          pickupUntil <= now
        ))
      ) {
        return res.status(400).json({
          success: false,
          data: {},
          message: 'Choose a valid pickup window within the next 24 hours.',
        });
      }

      const listing =
        await FoodListing.create({
          restaurantId:
            req.user._id,

          restaurantName:
            req.user.organizationName ||
            req.user.name,

          restaurantLocation:
            req.user.location,

          foodName:
            payload.foodName,

          foodType:
            payload.foodType,

          foodCategory:
            payload.foodCategory,

          quantity:
            Number(payload.quantity),

          quantityUnit:
            payload.quantityUnit,

          description:
            payload.description,

          images:
            (req.files || []).map(
              (file) =>
                `/uploads/${file.filename}`
            ),

          intendedRecipientType,

          pickupAvailableFrom:
            pickupFrom,

          pickupAvailableUntil:
            pickupUntil,
        });

      /**
       * Calculate operational redistribution priority.
       */
      await recalculatePriority(
        listing
      );

      await listing.save();

      const recipientRole =
        roleByIntent[
        intendedRecipientType
        ];

      const recipientRoom =
        roomByIntent[
        intendedRecipientType
        ];

      /**
       * Notify recipient role room.
       */
      emitToRoleRoom(
        recipientRoom,
        {
          action: 'new',
          event:
            'NEW_RELEVANT_DONATION',
          listingId:
            listing._id,
        }
      );

      let recipients =
        await User.find({
          role: recipientRole,
        }).select(
          '_id role location'
        );

      /**
       * For NGO / human redistribution,
       * only NGOs with matching active
       * requirements are considered relevant.
       *
       * Animal and industry recipients
       * are based on donor-declared intent.
       */
      const requirements =
        intendedRecipientType ===
          'human'
          ? await NGORequirement.find({
            status: 'active',
            foodType:
              listing.foodType,
            quantityUnit:
              listing.quantityUnit,
          }).select('ngo')
          : [];

      const relevantNgoIds =
        new Set(
          requirements.map(
            (requirement) =>
              String(
                requirement.ngo
              )
          )
        );

      recipients =
        recipients.filter(
          (recipient) => {
            const distance =
              haversineKm(
                listing.restaurantLocation,
                recipient.location
              );

            /**
             * Only notify recipients
             * within 50 km.
             */
            if (
              distance === null ||
              distance > 50
            ) {
              return false;
            }

            /**
             * NGO:
             * must have a matching
             * active requirement.
             */
            if (
              intendedRecipientType ===
              'human'
            ) {
              return relevantNgoIds.has(
                String(
                  recipient._id
                )
              );
            }

            /**
             * Animal / industry:
             * donor-declared intended use.
             */
            return true;
          }
        );

      /**
       * Send notifications.
       */
      await Promise.all(
        recipients.map(
          (recipient) =>
            createNotification({
              recipientId:
                recipient._id,

              recipientRole:
                recipient.role,

              type:
                'new_relevant_donation',

              message:
                `${(
                  listing.urgencyLevel ||
                  'normal'
                ).toLowerCase()} priority donation available: ${listing.foodName}.`,

              foodListingId:
                listing._id,
            })
        )
      );

      return res.status(201).json({
        success: true,

        data:
          serializeListing(
            listing,
            req.user.location
          ),

        message:
          'Donation created and redistribution priority calculated',
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        data: {},
        message:
          error.message ||
          'Failed to create donation',
      });
    }
  }
);

/**
 * ============================================================================
 * GET AVAILABLE DONATIONS
 * ============================================================================
 */

router.get(
  '/',
  auth,
  roleCheck(
    'ngo',
    'animal_husbandry',
    'industry'
  ),
  async (req, res) => {
    try {
      await expireStaleListings();
      const {
        foodType,
        radius,
        minQuantity,
        maxQuantity,
        minPriorityScore,
        maxPriorityScore,
        sortBy = 'personal',
        urgency,
        demandMatch,
      } = req.query;

      const intendedRecipientType =
        intentByRole[
        req.user.role
        ];

      const query = {
        status: 'available',

        intendedRecipientType,
        createdAt: { $gt: new Date(Date.now() - MAX_LISTING_AGE_MS) },
        $or: [
          { pickupAvailableUntil: null },
          { pickupAvailableUntil: { $gt: new Date() } },
        ],
      };

      /**
       * Food type filter.
       */
      if (foodType) {
        query.foodType =
          foodType;
      }

      /**
       * Urgency filter.
       */
      if (urgency) {
        query.urgencyLevel =
          String(
            urgency
          ).toUpperCase();
      }

      /**
       * Demand match filter.
       */
      if (
        demandMatch ===
        'true'
      ) {
        query[
          'priorityFactors.demandMatchScore'
        ] = {
          $gt: 0,
        };
      }

      /**
       * Priority score range.
       */
      if (
        minPriorityScore ||
        maxPriorityScore
      ) {
        query.priorityScore =
          {};

        if (
          minPriorityScore
        ) {
          query.priorityScore.$gte =
            Number(
              minPriorityScore
            );
        }

        if (
          maxPriorityScore
        ) {
          query.priorityScore.$lte =
            Number(
              maxPriorityScore
            );
        }
      }

      /**
       * Quantity range.
       */
      if (
        minQuantity ||
        maxQuantity
      ) {
        query.quantity =
          {};

        if (minQuantity) {
          query.quantity.$gte =
            Number(
              minQuantity
            );
        }

        if (maxQuantity) {
          query.quantity.$lte =
            Number(
              maxQuantity
            );
        }
      }

      /**
       * Distance / radius filter.
       */
      if (
        radius &&
        req.user.location?.coordinates
          ?.length === 2 &&
        req.user.location.coordinates.some(
          (coordinate) =>
            coordinate !== 0
        )
      ) {
        query.restaurantLocation =
        {
          $near: {
            $geometry:
              req.user.location,

            $maxDistance:
              Number(
                radius
              ) * 1000,
          },
        };
      }

      /**
       * Database sorting.
       */
      const sort =
        sortBy === 'quantity'
          ? {
            quantity: -1,
          }
          : sortBy === 'demand'
            ? {
              'priorityFactors.demandMatchScore': -1,
              priorityScore: -1,
            }
            : {
              priorityScore: -1,
              createdAt: 1,
            };

      const [listings, requirements] = await Promise.all([
        FoodListing.find(query)
          .sort(sort)
          .populate('restaurantId', 'name organizationName phone address location')
          .populate('claimedBy', 'name organizationName role phone'),
        req.user.role === 'ngo'
          ? NGORequirement.find({ status: 'active' }).lean()
          : Promise.resolve([]),
      ]);

      const data = listings.map((listing) => {
        const personalData = calculatePersonalizedScore({
          listing,
          recipient: req.user,
          requirements,
          preferences: req.user.priorityPreferences || DEFAULT_PREFERENCES,
        });

        return serializeListing(
          listing,
          req.user.location,
          personalData
        );
      });

      /**
       * Sort listings.
       */
      if (sortBy === 'personal') {
        data.sort(
          (a, b) => (b.personalScore || 0) - (a.personalScore || 0)
        );
      } else if (sortBy === 'distance') {
        data.sort((a, b) => {
          if (a.distanceKm === null && b.distanceKm === null) return 0;
          if (a.distanceKm === null) return 1;
          if (b.distanceKm === null) return -1;
          return a.distanceKm - b.distanceKm;
        });
      } else if (sortBy === 'urgency') {
        const urgencyRank = {
          URGENT: 0,
          HIGH: 1,
          MEDIUM: 2,
          NORMAL: 3,
        };

        data.sort(
          (a, b) =>
            urgencyRank[a.urgencyLevel] - urgencyRank[b.urgencyLevel] ||
            b.priorityScore - a.priorityScore
        );
      } else if (sortBy === 'quantity') {
        data.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
      } else if (sortBy === 'demand') {
        data.sort(
          (a, b) =>
            (b.priorityFactors?.demandMatchScore || 0) -
            (a.priorityFactors?.demandMatchScore || 0)
        );
      } else if (sortBy === 'priority') {
        data.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
      }

      return res.json({
        success: true,
        data,
        message:
          'Available donations fetched successfully',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        data: [],
        message:
          error.message ||
          'Failed to fetch available donations',
      });
    }
  }
);

/**
 * ============================================================================
 * GET RESTAURANT DONATIONS
 * ============================================================================
 */

router.get(
  '/restaurant',
  auth,
  roleCheck('restaurant'),
  async (req, res) => {
    try {
      await expireStaleListings();
      const listings =
        await FoodListing.find({
          restaurantId:
            req.user._id,

          intendedRecipientType:
          {
            $in:
              VALID_INTENTS,
          },
        })
          .sort({
            createdAt: -1,
          })
          .populate(
            'claimedBy',
            'name organizationName role phone'
          );

      const data =
        listings.map(
          (listing) =>
            serializeListing(
              listing,
              req.user.location
            )
        );

      return res.json({
        success: true,
        data,
        message:
          'Restaurant donations fetched successfully',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        data: [],
        message:
          error.message ||
          'Failed to fetch restaurant donations',
      });
    }
  }
);

/**
 * ============================================================================
 * GET SINGLE DONATION
 * ============================================================================
 */

router.get(
  '/:id',
  auth,
  async (req, res) => {
    try {
      const listing =
        await FoodListing.findById(
          req.params.id
        )
          .populate(
            'claimedBy',
            'name organizationName role phone'
          )
          .populate(
            'restaurantId',
            'name organizationName phone address'
          );

      if (!listing) {
        return res.status(404).json({
          success: false,
          data: {},
          message:
            'Donation not found',
        });
      }

      const ownerId =
        listing.restaurantId?._id ||
        listing.restaurantId;

      /**
       * Restaurant can only view
       * its own donation.
       */
      if (
        req.user.role ===
        'restaurant' &&
        String(ownerId) !==
        String(req.user._id)
      ) {
        return res.status(403).json({
          success: false,
          data: {},
          message:
            'This donation belongs to another donor',
        });
      }

      /**
       * Recipient can only view
       * donations intended for its role.
       */
      if (
        req.user.role !==
        'admin' &&
        req.user.role !==
        'restaurant' &&
        intentByRole[
        req.user.role
        ] !==
        listing.intendedRecipientType
      ) {
        return res.status(403).json({
          success: false,
          data: {},
          message:
            'This donation is not intended for your organization type',
        });
      }

      let personalData = null;
      if (['ngo', 'animal_husbandry', 'industry'].includes(req.user.role)) {
        const requirements =
          req.user.role === 'ngo'
            ? await NGORequirement.find({ status: 'active' }).lean()
            : [];
        personalData = calculatePersonalizedScore({
          listing,
          recipient: req.user,
          requirements,
          preferences: req.user.priorityPreferences || DEFAULT_PREFERENCES,
        });
      }

      return res.json({
        success: true,

        data:
          serializeListing(
            listing,
            req.user.location,
            personalData
          ),

        message:
          'Donation fetched successfully',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        data: {},
        message:
          error.message ||
          'Failed to fetch donation',
      });
    }
  }
);

/**
 * ============================================================================
 * UPDATE DONATION
 * ============================================================================
 */

router.put(
  '/:id',
  auth,
  roleCheck('restaurant'),
  async (req, res) => {
    try {
      await expireStaleListings();
      const listing =
        await FoodListing.findOne({
          _id: req.params.id,

          restaurantId:
            req.user._id,

          status: {
            $in: [
              'available',
              'requested',
            ],
          },
        });

      if (!listing) {
        return res.status(404).json({
          success: false,
          data: {},
          message:
            'Active donation not found',
        });
      }

      const {
        foodName,
        foodType,
        foodCategory,
        quantity,
        quantityUnit,
        description,
        intendedRecipientType,
        pickupAvailableFrom,
        pickupAvailableUntil,
      } = req.body;

      /**
       * Validate intended recipient.
       */
      if (
        intendedRecipientType &&
        !VALID_INTENTS.includes(
          intendedRecipientType
        )
      ) {
        return res.status(400).json({
          success: false,
          data: {},
          message:
            'Choose a valid intended recipient type',
        });
      }

      const previousIntent =
        listing.intendedRecipientType;

      const updates = {
        foodName,

        foodType,

        foodCategory,

        quantity:
          quantity ===
            undefined
            ? undefined
            : Number(
              quantity
            ),

        quantityUnit,

        description,

        intendedRecipientType,

        pickupAvailableFrom,

        pickupAvailableUntil,
      };

      Object.assign(
        listing,

        Object.fromEntries(
          Object.entries(
            updates
          ).filter(
            ([, value]) =>
              value !==
              undefined
          )
        )
      );

      /**
       * If donor changes intended
       * recipient while a request exists,
       * release the old request.
       */
      if (
        listing.status ===
        'requested' &&
        intendedRecipientType &&
        intendedRecipientType !==
        previousIntent
      ) {
        listing.status =
          'available';

        listing.claimedBy =
          null;

        listing.requestedAt =
          null;
      }

      /**
       * Recalculate redistribution
       * priority after changes.
       */
      await recalculatePriority(
        listing
      );

      await listing.save();

      emitToRoleRoom(
        roomByIntent[
        listing
          .intendedRecipientType
        ],
        {
          action:
            'updated',

          event:
            'DONATION_UPDATED',

          listingId:
            listing._id,
        }
      );

      return res.json({
        success: true,

        data:
          serializeListing(
            listing,
            req.user.location
          ),

        message:
          'Donation updated successfully',
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        data: {},
        message:
          error.message ||
          'Failed to update donation',
      });
    }
  }
);

/**
 * ============================================================================
 * REQUEST DONATION
 * ============================================================================
 */

router.put(
  '/:id/request',
  auth,
  roleCheck(
    'ngo',
    'animal_husbandry',
    'industry'
  ),
  async (req, res) => {
    try {
      await expireStaleListings();
      const listing =
        await FoodListing.findById(
          req.params.id
        );

      if (!listing) {
        return res.status(404).json({
          success: false,
          data: {},
          message:
            'Donation not found',
        });
      }

      if (
        listing.status !==
        'available'
      ) {
        return res.status(400).json({
          success: false,
          data: {},
          message:
            'Donation is no longer available',
        });
      }

      const recipientIntent =
        intentByRole[
        req.user.role
        ];

      /**
       * Ensure recipient role matches
       * donor-declared intended use.
       */
      if (
        recipientIntent !==
        listing.intendedRecipientType
      ) {
        return res.status(403).json({
          success: false,
          data: {},
          message:
            'This donation is not intended for your organization type',
        });
      }

      /**
       * Atomic update prevents two recipients
       * from requesting the same donation.
       */
      const requested =
        await FoodListing.findOneAndUpdate(
          {
            _id:
              req.params.id,

            status:
              'available',

            intendedRecipientType:
              recipientIntent,

            createdAt: { $gt: new Date(Date.now() - MAX_LISTING_AGE_MS) },
            $or: [
              { pickupAvailableUntil: null },
              { pickupAvailableUntil: { $gt: new Date() } },
            ],
          },

          {
            $set: {
              status:
                'requested',

              claimedBy:
                req.user._id,

              requestedAt:
                new Date(),
            },
          },

          {
            new: true,
          }
        );

      if (!requested) {
        return res.status(409).json({
          success: false,
          data: {},
          message:
            'Donation is no longer available or has different intended use',
        });
      }

      /**
       * Notify donor.
       */
      await createNotification({
        recipientId:
          requested.restaurantId,

        recipientRole:
          'restaurant',

        type:
          'donation_requested',

        message:
          `${req.user.organizationName || req.user.name} requested ${requested.foodName}.`,

        foodListingId:
          requested._id,
      });

      emitToRoleRoom(
        'restaurant-room',
        {
          action:
            'requested',

          event:
            'DONATION_REQUESTED',

          listingId:
            requested._id,
        }
      );

      return res.json({
        success: true,

        data:
          serializeListing(
            requested,
            req.user.location
          ),

        message:
          'Donation request sent to the donor',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        data: {},
        message:
          error.message ||
          'Failed to request donation',
      });
    }
  }
);

/**
 * ============================================================================
 * DONOR ACCEPTS REQUEST
 * ============================================================================
 */

router.put(
  '/:id/claim',
  auth,
  roleCheck('restaurant'),
  async (req, res) => {
    try {
      await expireStaleListings();
      const listing =
        await FoodListing.findOne({
          _id:
            req.params.id,

          restaurantId:
            req.user._id,

          status:
            'requested',
        });

      if (!listing) {
        return res.status(404).json({
          success: false,
          data: {},
          message:
            'Requested donation not found',
        });
      }

      listing.status =
        'claimed';

      listing.claimedAt =
        new Date();

      await listing.save();

      /**
       * Notify recipient.
       */
      await createNotification({
        recipientId:
          listing.claimedBy,

        recipientRole:
          roleByIntent[
          listing
            .intendedRecipientType
          ],

        type:
          'donation_claimed',

        message:
          `Your request for ${listing.foodName} was accepted. Please arrange collection from the donor location during the pickup window.`,

        foodListingId:
          listing._id,
      });

      emitToRoleRoom(
        roomByIntent[
        listing
          .intendedRecipientType
        ],
        {
          action:
            'claimed',

          event:
            'DONATION_CLAIMED',

          listingId:
            listing._id,
        }
      );

      return res.json({
        success: true,

        data:
          serializeListing(
            listing,
            req.user.location
          ),

        message:
          'Donation request accepted',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        data: {},
        message:
          error.message ||
          'Failed to accept donation request',
      });
    }
  }
);

/**
 * ============================================================================
 * RECIPIENT CONFIRMS PICKUP
 * ============================================================================
 *
 * THIS IS WHERE WAITING TIME STOPS.
 *
 * completedAt is stored.
 *
 * After this:
 *
 * waitingIsActive = false
 *
 * waitingDurationMinutes =
 * completedAt - createdAt
 *
 * The frontend can therefore show:
 *
 * "Total wait: 1d 4h 47m"
 *
 * instead of:
 *
 * "Waiting: 1d 4h 47m"
 *
 * ============================================================================
 */

router.put(
  '/:id/pickup-verify',
  auth,
  roleCheck(
    'ngo',
    'animal_husbandry',
    'industry'
  ),
  async (req, res) => {
    try {
      const listing =
        await FoodListing.findById(
          req.params.id
        );

      if (!listing) {
        return res.status(404).json({
          success: false,
          data: {},
          message:
            'Donation not found',
        });
      }

      /**
       * Only the accepted recipient
       * can confirm pickup.
       */
      if (
        String(
          listing.claimedBy
        ) !==
        String(
          req.user._id
        ) ||
        !['claimed', 'pickup_pending'].includes(listing.status)
      ) {
        return res.status(403).json({
          success: false,
          data: {},
          message:
            'Only the accepted recipient can confirm pickup',
        });
      }

      /**
       * ONE timestamp is used for both
       * pickup and completion.
       *
       * This freezes the waiting duration.
       */
      const completedAt =
        new Date();

      listing.status =
        'completed';

      listing.pickedUpAt =
        completedAt;

      listing.completedAt =
        completedAt;

      listing.pickupNote =
        req.body.notes || '';

      await listing.save();

      /**
       * Synchronize completed donation with WasteHistory
       */
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await WasteHistory.findOneAndUpdate(
          { restaurantId: listing.restaurantId, date: today },
          {
            $inc: { totalClaimed: listing.quantity || 0 },
            $push: {
              foodItems: {
                foodName: listing.foodName,
                foodType: listing.foodType,
                quantityPrepared: listing.quantity || 0,
                quantityWasted: 0,
                quantityClaimed: listing.quantity || 0,
              },
            },
            $setOnInsert: {
              dayOfWeek: today.toLocaleDateString('en-US', { weekday: 'long' }),
              totalWasted: 0,
              specialEvent: false,
            },
          },
          { upsert: true, new: true }
        );
      } catch (historyErr) {
        console.error('Failed to update waste history for completed listing:', historyErr);
      }

      /**
       * NGO pickup can fulfil NGO
       * requirements.
       *
       * Animal and industry donations
       * do not affect NGO requirements.
       */
      if (
        req.user.role ===
        'ngo'
      ) {
        const requirements =
          await NGORequirement.find(
            {
              ngo:
                req.user._id,

              foodType:
                listing.foodType,

              quantityUnit:
                listing.quantityUnit,

              status:
                'active',
            }
          ).sort({
            createdAt: 1,
          });

        let remaining =
          listing.quantity;

        for (
          const requirement of
          requirements
        ) {
          if (
            remaining <= 0
          ) {
            break;
          }

          const outstanding =
            Math.max(
              0,

              requirement.quantityRequired -
              requirement.quantityFulfilled
            );

          const fulfilledNow =
            Math.min(
              outstanding,
              remaining
            );

          requirement.quantityFulfilled +=
            fulfilledNow;

          remaining -=
            fulfilledNow;

          if (
            requirement.quantityFulfilled >=
            requirement.quantityRequired
          ) {
            requirement.status =
              'fulfilled';
          }

          await requirement.save();
        }
      }

      /**
       * Notify donor.
       */
      await createNotification({
        recipientId:
          listing.restaurantId,

        recipientRole:
          'restaurant',

        type:
          'donation_completed',

        message:
          `${req.user.organizationName || req.user.name} confirmed pickup of ${listing.foodName}.`,

        foodListingId:
          listing._id,
      });

      /**
       * Notify restaurant room.
       */
      emitToRoleRoom(
        'restaurant-room',
        {
          action:
            'completed',

          events: [
            'PICKUP_CONFIRMED',
            'DONATION_COMPLETED',
          ],

          listingId:
            listing._id,
        }
      );

      return res.json({
        success: true,

        data:
          serializeListing(
            listing,
            req.user.location
          ),

        message:
          'Pickup confirmed and donation completed',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        data: {},
        message:
          error.message ||
          'Failed to confirm pickup',
      });
    }
  }
);

/**
 * ============================================================================
 * CANCEL DONATION
 * ============================================================================
 */

router.delete(
  '/:id',
  auth,
  roleCheck('restaurant'),
  async (req, res) => {
    try {
      const listing =
        await FoodListing.findOneAndUpdate(
          {
            _id:
              req.params.id,

            restaurantId:
              req.user._id,

            status: {
              $in: [
                'available',
                'requested',
              ],
            },
          },

          {
            $set: {
              status:
                'cancelled',
            },
          },

          {
            new: true,
          }
        );

      if (!listing) {
        return res.status(404).json({
          success: false,
          data: {},
          message:
            'Active donation not found',
        });
      }

      /**
       * Notify intended recipient room.
       */
      emitToRoleRoom(
        roomByIntent[
        listing
          .intendedRecipientType
        ],
        {
          action:
            'cancelled',

          event:
            'DONATION_CANCELLED',

          listingId:
            listing._id,
        }
      );

      return res.json({
        success: true,

        data:
          serializeListing(
            listing,
            req.user.location
          ),

        message:
          'Donation cancelled',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        data: {},
        message:
          error.message ||
          'Failed to cancel donation',
      });
    }
  }
);

/**
 * ============================================================================
 * EXPORT ROUTER
 * ============================================================================
 */

module.exports = router;
