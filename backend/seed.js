import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Pharmacy from './models/Pharmacy.js';
import Medicine from './models/Medicine.js';
import Stock from './models/Stock.js';
import Order from './models/Order.js';
import Payment from './models/Payment.js';
import Cart from './models/Cart.js';
import SavedMedicine from './models/SavedMedicine.js';
import Notification from './models/Notification.js';
import Alert from './models/Alert.js';
import Prescription from './models/Prescription.js';
import Review from './models/Review.js';
dotenv.config();
import logger from './utils/logger.js';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info("Connected to MongoDB");
  } catch (err) {
    logger.error("DB Error:", err.message);
    process.exit(1);
  }
};

const medicinesData = [
  { name: "Paracetamol 500mg", genericName: "Acetaminophen", manufacturer: "Cipla", category: "Painkillers", dosageForm: "Tablet", strength: "500mg", prescriptionRequired: false, mrp: 25, description: "For fever and mild pain relief" },
  { name: "Dolo 650", genericName: "Paracetamol", manufacturer: "Micro Labs", category: "Painkillers", dosageForm: "Tablet", strength: "650mg", prescriptionRequired: false, mrp: 30, description: "Effective for fever and headache" },
  { name: "Crocin Advance", genericName: "Paracetamol", manufacturer: "GSK", category: "Painkillers", dosageForm: "Tablet", strength: "500mg", prescriptionRequired: false, mrp: 28, description: "Fast acting pain relief" },
  { name: "Ibuprofen 400mg", genericName: "Ibuprofen", manufacturer: "Sun Pharma", category: "Painkillers", dosageForm: "Tablet", strength: "400mg", prescriptionRequired: false, mrp: 45, description: "Anti-inflammatory painkiller" },
  { name: "Combiflam", genericName: "Ibuprofen+Paracetamol", manufacturer: "Sanofi", category: "Painkillers", dosageForm: "Tablet", strength: "400mg+325mg", prescriptionRequired: false, mrp: 38, description: "Dual action pain relief" },
  { name: "Aspirin 75mg", genericName: "Acetylsalicylic Acid", manufacturer: "Bayer", category: "Heart", dosageForm: "Tablet", strength: "75mg", prescriptionRequired: false, mrp: 22, description: "For heart health" },
  { name: "Diclofenac Gel", genericName: "Diclofenac", manufacturer: "Novartis", category: "Painkillers", dosageForm: "Cream", strength: "1%", prescriptionRequired: false, mrp: 85, description: "Topical pain relief" },
  { name: "Tramadol 50mg", genericName: "Tramadol", manufacturer: "Zydus", category: "Painkillers", dosageForm: "Tablet", strength: "50mg", prescriptionRequired: true, mrp: 65, description: "Strong pain relief" },
  { name: "Azithromycin 500mg", genericName: "Azithromycin", manufacturer: "Alkem", category: "Antibiotics", dosageForm: "Tablet", strength: "500mg", prescriptionRequired: true, mrp: 150, description: "Broad spectrum antibiotic" },
  { name: "Amoxicillin 500mg", genericName: "Amoxicillin", manufacturer: "Cipla", category: "Antibiotics", dosageForm: "Capsule", strength: "500mg", prescriptionRequired: true, mrp: 95, description: "Penicillin antibiotic" },
  { name: "Ciprofloxacin 500mg", genericName: "Ciprofloxacin", manufacturer: "Ranbaxy", category: "Antibiotics", dosageForm: "Tablet", strength: "500mg", prescriptionRequired: true, mrp: 125, description: "Fluoroquinolone antibiotic" },
  { name: "Augmentin 625mg", genericName: "Amoxicillin+Clavulanate", manufacturer: "GSK", category: "Antibiotics", dosageForm: "Tablet", strength: "625mg", prescriptionRequired: true, mrp: 180, description: "Enhanced antibiotic" },
  { name: "Cefixime 200mg", genericName: "Cefixime", manufacturer: "Sun Pharma", category: "Antibiotics", dosageForm: "Tablet", strength: "200mg", prescriptionRequired: true, mrp: 145, description: "Cephalosporin antibiotic" },
  { name: "Doxycycline 100mg", genericName: "Doxycycline", manufacturer: "Zydus", category: "Antibiotics", dosageForm: "Capsule", strength: "100mg", prescriptionRequired: true, mrp: 110, description: "Tetracycline antibiotic" },
  { name: "Cetirizine 10mg", genericName: "Cetirizine", manufacturer: "Sun Pharma", category: "Allergies", dosageForm: "Tablet", strength: "10mg", prescriptionRequired: false, mrp: 40, description: "Antihistamine for allergies" },
  { name: "Allegra 120mg", genericName: "Fexofenadine", manufacturer: "Sanofi", category: "Allergies", dosageForm: "Tablet", strength: "120mg", prescriptionRequired: false, mrp: 65, description: "Non-drowsy allergy relief" },
  { name: "Levocetirizine 5mg", genericName: "Levocetirizine", manufacturer: "Cipla", category: "Allergies", dosageForm: "Tablet", strength: "5mg", prescriptionRequired: false, mrp: 48, description: "Advanced allergy medication" },
  { name: "Montair LC", genericName: "Montelukast+Levocetirizine", manufacturer: "Cipla", category: "Allergies", dosageForm: "Tablet", strength: "10mg+5mg", prescriptionRequired: false, mrp: 95, description: "Dual action allergy relief" },
  { name: "Pantoprazole 40mg", genericName: "Pantoprazole", manufacturer: "Torrent", category: "Antacids", dosageForm: "Tablet", strength: "40mg", prescriptionRequired: false, mrp: 110, description: "Proton pump inhibitor" },
  { name: "Omeprazole 20mg", genericName: "Omeprazole", manufacturer: "Dr Reddys", category: "Antacids", dosageForm: "Capsule", strength: "20mg", prescriptionRequired: false, mrp: 88, description: "Acid reflux treatment" },
  { name: "Ranitidine 150mg", genericName: "Ranitidine", manufacturer: "GSK", category: "Antacids", dosageForm: "Tablet", strength: "150mg", prescriptionRequired: false, mrp: 55, description: "H2 blocker for acidity" },
  { name: "ENO Powder", genericName: "Fruit Salt", manufacturer: "GSK", category: "Antacids", dosageForm: "Powder", strength: "5g", prescriptionRequired: false, mrp: 35, description: "Instant acidity relief" },
  { name: "Gelusil Syrup", genericName: "Antacid", manufacturer: "Pfizer", category: "Antacids", dosageForm: "Syrup", strength: "200ml", prescriptionRequired: false, mrp: 125, description: "Liquid antacid" },
  { name: "Domperidone 10mg", genericName: "Domperidone", manufacturer: "Cipla", category: "Digestive", dosageForm: "Tablet", strength: "10mg", prescriptionRequired: false, mrp: 45, description: "Anti-nausea medication" },
  { name: "Ondansetron 4mg", genericName: "Ondansetron", manufacturer: "GSK", category: "Digestive", dosageForm: "Tablet", strength: "4mg", prescriptionRequired: true, mrp: 85, description: "Prevents nausea and vomiting" },
  { name: "Electral Powder", genericName: "ORS", manufacturer: "FDC", category: "Digestive", dosageForm: "Powder", strength: "21.8g", prescriptionRequired: false, mrp: 22, description: "Oral rehydration salts" },
  { name: "Metformin 500mg", genericName: "Metformin", manufacturer: "USV", category: "Diabetes", dosageForm: "Tablet", strength: "500mg", prescriptionRequired: true, mrp: 65, description: "Type 2 diabetes medication" },
  { name: "Glimepiride 1mg", genericName: "Glimepiride", manufacturer: "Sanofi", category: "Diabetes", dosageForm: "Tablet", strength: "1mg", prescriptionRequired: true, mrp: 85, description: "Blood sugar control" },
  { name: "Januvia 100mg", genericName: "Sitagliptin", manufacturer: "MSD", category: "Diabetes", dosageForm: "Tablet", strength: "100mg", prescriptionRequired: true, mrp: 450, description: "DPP-4 inhibitor" },
  { name: "Insulin Glargine", genericName: "Insulin Glargine", manufacturer: "Sanofi", category: "Diabetes", dosageForm: "Injection", strength: "100IU/ml", prescriptionRequired: true, mrp: 850, description: "Long-acting insulin" },
  { name: "Amlodipine 5mg", genericName: "Amlodipine", manufacturer: "Pfizer", category: "Blood Pressure", dosageForm: "Tablet", strength: "5mg", prescriptionRequired: true, mrp: 75, description: "Calcium channel blocker" },
  { name: "Telmisartan 40mg", genericName: "Telmisartan", manufacturer: "Glenmark", category: "Blood Pressure", dosageForm: "Tablet", strength: "40mg", prescriptionRequired: true, mrp: 95, description: "ARB for hypertension" },
  { name: "Atenolol 50mg", genericName: "Atenolol", manufacturer: "Cipla", category: "Blood Pressure", dosageForm: "Tablet", strength: "50mg", prescriptionRequired: true, mrp: 55, description: "Beta blocker" },
  { name: "Losartan 50mg", genericName: "Losartan", manufacturer: "Sun Pharma", category: "Blood Pressure", dosageForm: "Tablet", strength: "50mg", prescriptionRequired: true, mrp: 82, description: "Angiotensin blocker" },
  { name: "Atorvastatin 10mg", genericName: "Atorvastatin", manufacturer: "Pfizer", category: "Heart", dosageForm: "Tablet", strength: "10mg", prescriptionRequired: true, mrp: 125, description: "Cholesterol lowering" },
  { name: "Clopidogrel 75mg", genericName: "Clopidogrel", manufacturer: "Sanofi", category: "Heart", dosageForm: "Tablet", strength: "75mg", prescriptionRequired: true, mrp: 145, description: "Anti-platelet medication" },
  { name: "Vitamin D3 60000IU", genericName: "Cholecalciferol", manufacturer: "Mankind", category: "Vitamins", dosageForm: "Capsule", strength: "60000IU", prescriptionRequired: false, mrp: 45, description: "Vitamin D supplement" },
  { name: "Vitamin B12 1500mcg", genericName: "Methylcobalamin", manufacturer: "Sun Pharma", category: "Vitamins", dosageForm: "Tablet", strength: "1500mcg", prescriptionRequired: false, mrp: 95, description: "Nerve health vitamin" },
  { name: "Multivitamin Tablets", genericName: "Multivitamin", manufacturer: "Pfizer", category: "Vitamins", dosageForm: "Tablet", strength: "Daily", prescriptionRequired: false, mrp: 185, description: "Complete multivitamin" },
  { name: "Calcium + Vitamin D", genericName: "Calcium Carbonate", manufacturer: "Cipla", category: "Vitamins", dosageForm: "Tablet", strength: "500mg", prescriptionRequired: false, mrp: 125, description: "Bone health supplement" },
  { name: "Omega-3 Capsules", genericName: "Fish Oil", manufacturer: "HealthKart", category: "Vitamins", dosageForm: "Capsule", strength: "1000mg", prescriptionRequired: false, mrp: 450, description: "Heart and brain health" },
  { name: "Iron Folic Acid", genericName: "Ferrous Sulfate", manufacturer: "Sun Pharma", category: "Vitamins", dosageForm: "Tablet", strength: "100mg", prescriptionRequired: false, mrp: 55, description: "Anemia treatment" },
  { name: "Vitamin C 500mg", genericName: "Ascorbic Acid", manufacturer: "Himalaya", category: "Vitamins", dosageForm: "Tablet", strength: "500mg", prescriptionRequired: false, mrp: 85, description: "Immunity booster" },
  { name: "Zinc Tablets 50mg", genericName: "Zinc Sulfate", manufacturer: "Mankind", category: "Vitamins", dosageForm: "Tablet", strength: "50mg", prescriptionRequired: false, mrp: 65, description: "Immune support" },
  { name: "Montelukast 10mg", genericName: "Montelukast", manufacturer: "Cipla", category: "Respiratory", dosageForm: "Tablet", strength: "10mg", prescriptionRequired: true, mrp: 95, description: "Asthma prevention" },
  { name: "Salbutamol Inhaler", genericName: "Salbutamol", manufacturer: "GSK", category: "Respiratory", dosageForm: "Inhaler", strength: "100mcg", prescriptionRequired: true, mrp: 165, description: "Asthma relief inhaler" },
  { name: "Benadryl Cough Syrup", genericName: "Diphenhydramine", manufacturer: "Johnson and Johnson", category: "Respiratory", dosageForm: "Syrup", strength: "100ml", prescriptionRequired: false, mrp: 95, description: "Cough suppressant" },
  { name: "Ascoril LS Syrup", genericName: "Ambroxol+Levosalbutamol", manufacturer: "Glenmark", category: "Respiratory", dosageForm: "Syrup", strength: "100ml", prescriptionRequired: false, mrp: 125, description: "Cough and cold relief" },
  { name: "Betnovate Cream", genericName: "Betamethasone", manufacturer: "GSK", category: "Skin", dosageForm: "Cream", strength: "0.1%", prescriptionRequired: true, mrp: 85, description: "Steroid cream for skin conditions" },
  { name: "Clotrimazole Cream", genericName: "Clotrimazole", manufacturer: "Cipla", category: "Skin", dosageForm: "Cream", strength: "1%", prescriptionRequired: false, mrp: 55, description: "Antifungal cream" },
  { name: "Calamine Lotion", genericName: "Calamine", manufacturer: "Himalaya", category: "Skin", dosageForm: "Other", strength: "100ml", prescriptionRequired: false, mrp: 75, description: "Soothing lotion" },
  { name: "Adapalene Gel", genericName: "Adapalene", manufacturer: "Galderma", category: "Skin", dosageForm: "Cream", strength: "0.1%", prescriptionRequired: true, mrp: 450, description: "Acne treatment" },
  { name: "Refresh Tears", genericName: "Carboxymethylcellulose", manufacturer: "Allergan", category: "Eye Care", dosageForm: "Drops", strength: "10ml", prescriptionRequired: false, mrp: 165, description: "Artificial tears" },
  { name: "Moxifloxacin Eye Drops", genericName: "Moxifloxacin", manufacturer: "Alcon", category: "Eye Care", dosageForm: "Drops", strength: "5ml", prescriptionRequired: true, mrp: 125, description: "Antibiotic eye drops" },
  { name: "Fluoxetine 20mg", genericName: "Fluoxetine", manufacturer: "Eli Lilly", category: "Mental Health", dosageForm: "Capsule", strength: "20mg", prescriptionRequired: true, mrp: 185, description: "Antidepressant" },
  { name: "Escitalopram 10mg", genericName: "Escitalopram", manufacturer: "Cipla", category: "Mental Health", dosageForm: "Tablet", strength: "10mg", prescriptionRequired: true, mrp: 145, description: "SSRI antidepressant" },
  { name: "Alprazolam 0.5mg", genericName: "Alprazolam", manufacturer: "Pfizer", category: "Mental Health", dosageForm: "Tablet", strength: "0.5mg", prescriptionRequired: true, mrp: 75, description: "Anti-anxiety medication" },
  { name: "Levothyroxine 50mcg", genericName: "Levothyroxine", manufacturer: "Abbott", category: "Hormones", dosageForm: "Tablet", strength: "50mcg", prescriptionRequired: true, mrp: 95, description: "Thyroid hormone" },
  { name: "Prednisolone 10mg", genericName: "Prednisolone", manufacturer: "Cipla", category: "Hormones", dosageForm: "Tablet", strength: "10mg", prescriptionRequired: true, mrp: 65, description: "Corticosteroid" },
  { name: "Dettol Antiseptic", genericName: "Chloroxylenol", manufacturer: "Reckitt", category: "Other", dosageForm: "Other", strength: "100ml", prescriptionRequired: false, mrp: 95, description: "Antiseptic liquid" },
  { name: "Burnol Cream", genericName: "Antiseptic", manufacturer: "Reckitt", category: "Other", dosageForm: "Cream", strength: "20g", prescriptionRequired: false, mrp: 55, description: "Burn relief cream" },
  { name: "Band-Aid Pack", genericName: "Adhesive Bandages", manufacturer: "Johnson and Johnson", category: "Other", dosageForm: "Other", strength: "10 strips", prescriptionRequired: false, mrp: 45, description: "Wound care" }
];

const seedDatabase = async () => {
  try {
    await connectDB();

    const existingMedicines = await Medicine.countDocuments();
      if (existingMedicines > 0) {
        logger.info("✅ Database already has data, skipping seed.");
        process.exit(0);
      }

    logger.info("Clearing database...");
    await Promise.all([
      Review.deleteMany({}), Prescription.deleteMany({}), Alert.deleteMany({}),
      Notification.deleteMany({}), SavedMedicine.deleteMany({}), Cart.deleteMany({}),
      Payment.deleteMany({}), Order.deleteMany({}), Stock.deleteMany({}),
      Medicine.deleteMany({}), Pharmacy.deleteMany({}), User.deleteMany({})
    ]);
    logger.info("Database cleared");

    // ADMIN
    const admin = await User.create({
      name: "Admin User", email: "admin@medifind.com", password: "admin123",
      phone: "+91 9999999999", role: "admin", isActive: true, isVerified: true,
      address: { street: "Admin Office", city: "Vadodara", state: "Gujarat", pincode: "390001", coordinates: { lat: 22.3072, lng: 73.1812 } }
    });
    logger.info("Admin created:", admin.email);

    // PHARMACY OWNERS
    const ownerData = [
      { name: "Rajesh Kumar", email: "rajesh.apollo@gmail.com", lat: 22.3072, lng: 73.1812, pincode: "390007" },
      { name: "Priya Sharma", email: "priya.medplus@gmail.com", lat: 22.3195, lng: 73.1925, pincode: "390002" },
      { name: "Suresh Patel", email: "suresh.lifeline@gmail.com", lat: 22.3155, lng: 73.1896, pincode: "390011" },
      { name: "Anita Mehta", email: "anita.wellness@gmail.com", lat: 22.3089, lng: 73.1812, pincode: "390018" },
      { name: "Vikram Singh", email: "vikram.care@gmail.com", lat: 22.2760, lng: 73.1885, pincode: "390019" }
    ];
    const pharmacyOwners = await User.create(ownerData.map(o => ({
      name: o.name, email: o.email, password: "pharmacy123",
      phone: "+91 9876543210", role: "pharmacy", isActive: true, isVerified: true,
      address: { street: "Pharmacy Street", city: "Vadodara", state: "Gujarat", pincode: o.pincode, coordinates: { lat: o.lat, lng: o.lng } }
    })));
    logger.info(pharmacyOwners.length, "pharmacy owners created");

    // PHARMACIES
    const pharmData = [
      { name: "Apollo Pharmacy - Alkapuri", license: "GUJ-PHARM-2023-001", email: "apollo.alkapuri@apollopharmacy.in", phone: "+91 265 2334455", street: "10, Alkapuri Society", pincode: "390007", lat: 22.3072, lng: 73.1812, open: "08:00", close: "22:00", is24: false, rating: 4.5, totalRatings: 128 },
      { name: "MedPlus - Fatehgunj", license: "GUJ-PHARM-2023-002", email: "medplus.fatehgunj@medplus.in", phone: "+91 265 2445566", street: "22, Fatehgunj Main Road", pincode: "390002", lat: 22.3195, lng: 73.1925, open: "09:00", close: "21:00", is24: false, rating: 4.3, totalRatings: 95 },
      { name: "Lifeline Medical Store", license: "GUJ-PHARM-2023-003", email: "lifeline.manjalpur@gmail.com", phone: "+91 265 2556677", street: "5, Manjalpur Ring Road", pincode: "390011", lat: 22.3155, lng: 73.1896, open: "00:00", close: "23:59", is24: true, rating: 4.7, totalRatings: 210 },
      { name: "Wellness Pharmacy - Karelibaug", license: "GUJ-PHARM-2023-004", email: "wellness.karelibaug@gmail.com", phone: "+91 265 2667788", street: "8, Karelibaug Near Temple", pincode: "390018", lat: 22.3089, lng: 73.1812, open: "08:30", close: "21:30", is24: false, rating: 4.2, totalRatings: 73 },
      { name: "Care Medicals - Waghodia", license: "GUJ-PHARM-2023-005", email: "care.waghodia@gmail.com", phone: "+91 265 2778899", street: "15, Waghodia Road Crossing", pincode: "390019", lat: 22.2760, lng: 73.1885, open: "09:00", close: "20:00", is24: false, rating: 4.0, totalRatings: 42 }
    ];
    const pharmacies = await Pharmacy.create(pharmData.map((p, i) => ({
      name: p.name, owner: pharmacyOwners[i]._id, licenseNumber: p.license,
      email: p.email, phone: p.phone,
      address: { street: p.street, city: "Vadodara", state: "Gujarat", pincode: p.pincode, coordinates: { lat: p.lat, lng: p.lng } },
      operatingHours: { open: p.open, close: p.close, is24Hours: p.is24 },
      status: 'approved', isVerified: true, isActive: true, rating: p.rating, totalRatings: p.totalRatings
    })));
    logger.info(pharmacies.length, "pharmacies created");

    // Link owners to pharmacies
    for (let i = 0; i < pharmacyOwners.length; i++) {
      await User.findByIdAndUpdate(pharmacyOwners[i]._id, { pharmacyId: pharmacies[i]._id });
    }

    // MEDICINES
    const medicines = await Medicine.create(medicinesData);
    logger.info(medicines.length, "medicines created");

    // STOCK
    const stocksToCreate = [];
    const expiryDates = [
      new Date("2026-06-01"), new Date("2026-09-01"), new Date("2026-12-01"),
      new Date("2027-03-01"), new Date("2027-06-01"), new Date("2027-12-01"),
      new Date("2028-01-01"), new Date("2028-06-01")
    ];
    for (const pharmacy of pharmacies) {
      const numMeds = 30 + Math.floor(Math.random() * 21);
      const shuffled = [...medicines].sort(() => 0.5 - Math.random()).slice(0, numMeds);
      for (const med of shuffled) {
        const price =  Math.floor(Math.random() * 500) + 20
        stocksToCreate.push({
          pharmacy: pharmacy._id, medicine: med._id,
          quantity: Math.floor(Math.random() * 200) + 5,
          price, discount:   Number((Math.random() * 100).toFixed(2)),
          batchNumber: "BATCH" + Math.random().toString(36).substring(2, 8).toUpperCase(),
          expiryDate: expiryDates[Math.floor(Math.random() * expiryDates.length)],
          isAvailable: true, lastUpdated: new Date()
        });
      }
    }
    const stocks = await Stock.create(stocksToCreate);
    logger.info(stocks.length, "stock entries created");

    // PATIENTS
    const patientData = [
      { name: "Amit Patel", email: "amit.patel@gmail.com", phone: "+91 9876501001", street: "12 Alkapuri", pincode: "390007", lat: 22.3103, lng: 73.1877 },
      { name: "Neha Shah", email: "neha.shah@gmail.com", phone: "+91 9876501002", street: "45 Manjalpur", pincode: "390011", lat: 22.2847, lng: 73.1833 },
      { name: "Ravi Joshi", email: "ravi.joshi@gmail.com", phone: "+91 9876501003", street: "7 Fatehgunj", pincode: "390002", lat: 22.2917, lng: 73.1700 },
      { name: "Kavita Desai", email: "kavita.desai@gmail.com", phone: "+91 9876501004", street: "22 Karelibaug", pincode: "390018", lat: 22.2642, lng: 73.1956 },
      { name: "Sunil Mehta", email: "sunil.mehta@gmail.com", phone: "+91 9876501005", street: "3 Waghodia Rd", pincode: "390019", lat: 22.3264, lng: 73.1772 },
      { name: "Pooja Singh", email: "pooja.singh@gmail.com", phone: "+91 9876501006", street: "88 Sayajigunj", pincode: "390005", lat: 22.3031, lng: 73.1961 },
      { name: "Mahesh Trivedi", email: "mahesh.trivedi@gmail.com", phone: "+91 9876501007", street: "11 Vasna", pincode: "390015", lat: 22.3264, lng: 73.1892 },
      { name: "Anita Kulkarni", email: "anita.kulkarni@gmail.com", phone: "+91 9876501008", street: "34 Gotri", pincode: "390021", lat: 22.2985, lng: 73.1741 },
      { name: "Deepak Rao", email: "deepak.rao@gmail.com", phone: "+91 9876501009", street: "56 Akota", pincode: "390020", lat: 22.3148, lng: 73.1689 },
      { name: "Sunita Verma", email: "sunita.verma@gmail.com", phone: "+91 9876501010", street: "9 Nizampura", pincode: "390002", lat: 22.3215, lng: 73.2001 }
    ];
    const patients = await User.create(patientData.map(p => ({
      name: p.name, email: p.email, password: "patient123", phone: p.phone,
      role: "patient", isActive: true, isVerified: true,
      address: { street: p.street, city: "Vadodara", state: "Gujarat", pincode: p.pincode, coordinates: { lat: p.lat, lng: p.lng } }
    })));


    // CARTS
    const cartsToCreate = [];
    for (const patient of patients) {
      if (Math.random() < 0.6) {
        const items = [];
        for (let i = 0; i < 1 + Math.floor(Math.random() * 4); i++) {
          const pharm = pharmacies[Math.floor(Math.random() * pharmacies.length)];
          const pharmStocks = stocks.filter(s => s.pharmacy.toString() === pharm._id.toString() && s.quantity > 0);
          if (!pharmStocks.length) continue;
          const s = pharmStocks[Math.floor(Math.random() * pharmStocks.length)];
          items.push({ medicine: s.medicine, pharmacy: pharm._id, stock: s._id, quantity: 1 + Math.floor(Math.random() * 3), price: s.price, discount: s.discount || 0 });
        }
        if (items.length) cartsToCreate.push({ user: patient._id, items });
      }
    }
    const carts = await Cart.create(cartsToCreate);
    logger.info(carts.length, "carts created");

    // ALERTS
    const alertsToCreate = [];
    for (const patient of patients) {
      for (let i = 0; i < Math.floor(Math.random() * 4); i++) {
        const med = medicines[Math.floor(Math.random() * medicines.length)];
        const type = ["availability","price_drop","expiry_reminder"][Math.floor(Math.random() * 3)];
        alertsToCreate.push({
          user: patient._id, medicine: med._id,
          pharmacy: Math.random() < 0.5 ? pharmacies[Math.floor(Math.random() * pharmacies.length)]._id : null,
          type, targetPrice: type === "price_drop" ? Math.round(med.mrp * 0.8) : null,
          isTriggered: Math.random() < 0.3, isActive: true, notificationSent: Math.random() < 0.5, notificationMethod: "email"
        });
      }
    }
    const alerts = await Alert.create(alertsToCreate);
    logger.info(alerts.length, "alerts created");

    logger.info("\n===== SEED COMPLETE =====");
    logger.info("Admin: admin@medifind.com / admin123");
    pharmacyOwners.forEach((o,i) => logger.info("Pharmacy:", o.email, "->", pharmacies[i].name, "/ pharmacy123"));
    patients.forEach(p => logger.info("Patient:", p.email, "/ patient123"));
    process.exit(0);
  } catch (err) {
    logger.error("SEED ERROR:", err.message);
    logger.error(err.stack);
    process.exit(1);
  }
};

seedDatabase();