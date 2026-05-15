import Cart from '../models/Cart.js';
import Stock from '../models/Stock.js';
import Medicine from '../models/Medicine.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';

// Get my cart
export const getMyCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.userId })
    .populate('items.medicine')
    .populate('items.pharmacy');

  sendSuccess(res, 200, {
    cart
  }, 'Cart fetched successfully');
});

// Add item to cart
export const addToCart = asyncHandler(async (req, res) => {
  const { medicineId, pharmacyId, quantity = 1 } = req.body;

  // Check stock availability
  const stock = await Stock.findOne({
    pharmacy: pharmacyId,
    medicine: medicineId,
    isAvailable: true,
    quantity: { $gt: 0 }
  }).populate('medicine', 'name');

  if (!stock) {
    return sendError(res, 400, 'Medicine not available in this pharmacy');
  }

  if (stock.quantity < quantity) {
    return sendError(res, 400, `Only ${stock.quantity} units available`);
  }

  let cart = await Cart.findOne({ user: req.userId });
  if (!cart) {
    cart = new Cart({ user: req.userId, items: [] });
  }

  // Check if different pharmacy already in cart
  const existingPharmacy = cart.items.find(i => i.pharmacy.toString() !== pharmacyId);
  if (cart.items.length > 0 && existingPharmacy) {
    return sendError(res, 400, 'Cart can only contain items from one pharmacy. Please clear cart first.');
  }

  const existingItemIdx = cart.items.findIndex(
    i => i.medicine.toString() === medicineId && i.pharmacy.toString() === pharmacyId
  );

  if (existingItemIdx >= 0) {
    cart.items[existingItemIdx].quantity += quantity;
  } else {
    cart.items.push({
      medicine: medicineId,
      pharmacy: pharmacyId,
      quantity,
      price: stock.price,
      discount: stock.discount || 0
    });
  }

  await cart.save();

  await cart.populate('items.medicine', 'name genericName manufacturer dosageForm mrp image');
  await cart.populate('items.pharmacy', 'name address phone');

  sendSuccess(res, 200, { cart }, 'Item added to cart');
});

// Update cart item quantity
export const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.userId });
  if (!cart) return sendError(res, 404, 'Cart not found');

  const item = cart.items.id(itemId);
  if (!item) return sendError(res, 404, 'Item not found in cart');

  if (quantity <= 0) {
    item.remove();
  } else {
    // Verify stock
    const stock = await Stock.findOne({
      pharmacy: item.pharmacy,
      medicine: item.medicine,
      isAvailable: true
    });
    if (stock && stock.quantity < quantity) {
      return sendError(res, 400, `Only ${stock.quantity} units available`);
    }
    item.quantity = quantity;
  }

  await cart.save();
  await cart.populate('items.medicine', 'name genericName manufacturer dosageForm mrp image');
  await cart.populate('items.pharmacy', 'name address phone');

  sendSuccess(res, 200, { cart }, 'Cart updated');
});

// Remove item from cart
export const removeFromCart = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.userId });
  if (!cart) return sendError(res, 404, 'Cart not found');

  cart.items = cart.items.filter(i => i._id.toString() !== itemId);
  await cart.save();

  await cart.populate('items.medicine', 'name genericName manufacturer dosageForm mrp image');
  await cart.populate('items.pharmacy', 'name address phone');

  sendSuccess(res, 200, { cart }, 'Item removed from cart');
});

// Clear cart
export const clearCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndUpdate(
    { user: req.userId },
    { items: [] }
  );
  sendSuccess(res, 200, null, 'Cart cleared');
});