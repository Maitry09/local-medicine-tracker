// ADD THIS to backend/routes/pharmacy.routes.js  (before export default router)
// Also ensure Pharmacy model has a 2dsphere index on address.location

// GET /api/pharmacies/nearby?lat=22.3&lng=73.1&radius=5&medicine=MEDICINE_ID
router.get('/nearby', asyncHandler(async (req, res) => {
  const { lat, lng, radius = 5, medicine } = req.query;

  if (!lat || !lng) return sendError(res, 400, 'lat and lng are required');

  const radiusInMeters = parseFloat(radius) * 1000;

  const query = {
    status: 'approved',
    isActive: true,
    'address.location': {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: radiusInMeters
      }
    }
  };

  let pharmacies = await Pharmacy.find(query).limit(20).lean();

  // If a medicine is requested, attach stock info for each pharmacy
  if (medicine) {
    const stockItems = await Stock.find({ medicine, quantity: { $gt: 0 }, isAvailable: true })
      .select('pharmacy price quantity discount')
      .lean();

    const stockMap = {};
    stockItems.forEach(s => { stockMap[s.pharmacy.toString()] = s; });

    pharmacies = pharmacies.map(p => ({
      ...p,
      stockInfo: stockMap[p._id.toString()] || null
    }));
  }

  sendSuccess(res, 200, { pharmacies, count: pharmacies.length }, 'Nearby pharmacies fetched');
}));

// Also add to Pharmacy model (one-time migration helper) — PUT in admin.routes.js:
// router.post('/fix-geo-index', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
//   await Pharmacy.collection.createIndex({ 'address.location': '2dsphere' });
//   res.json({ success: true });
// }));
