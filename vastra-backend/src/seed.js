require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Product = require('./models/Product');

const products = [
  {
    name: 'Royal Crimson Banarasi Silk',
    description: 'Exquisite handwoven Banarasi silk saree with intricate zari work. Features traditional Mughal-inspired floral and paisley motifs woven with pure gold zari thread. Perfect for weddings and grand occasions.',
    category: 'Banarasi', fabric: 'Pure Silk', origin: 'Varanasi, Uttar Pradesh',
    occasion: ['Wedding','Bridal','Festive'], colors: ['Red','Crimson','Gold'],
    price: 18500, originalPrice: 22000,
    images: ['https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800&q=85'],
    stock: 15, featured: true, newArrival: true, bestseller: true, rating: 4.8, reviewCount: 124,
    tags: ['banarasi','silk','zari','wedding','bridal'], length: '6.3m', blouseIncluded: true,
  },
  {
    name: 'Kanjivaram Purple Zari Weave',
    description: 'Traditional Kanjivaram silk saree handwoven by master weavers of Kanchipuram. Pure mulberry silk with thick gold zari border. GI-certified authentic weave.',
    category: 'Kanjivaram', fabric: 'Mulberry Silk', origin: 'Kanchipuram, Tamil Nadu',
    occasion: ['Wedding','Festive','Party'], colors: ['Purple','Gold'],
    price: 24000, originalPrice: 28000,
    images: ['https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=800&q=85'],
    stock: 8, featured: true, bestseller: true, rating: 4.9, reviewCount: 89,
    tags: ['kanjivaram','silk','gi-certified','temple-border'], length: '6.3m', blouseIncluded: true,
  },
  {
    name: 'Chanderi Ivory Tissue Silk',
    description: 'Lightweight Chanderi fabric with a natural sheen. Hand-woven with fine silk and cotton blend. Features delicate boota motifs and a sheer, airy drape. Perfect for daytime events.',
    category: 'Chanderi', fabric: 'Silk Cotton', origin: 'Chanderi, Madhya Pradesh',
    occasion: ['Party','Casual','Office'], colors: ['Ivory','Silver'],
    price: 8500,
    images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=85'],
    stock: 22, featured: true, newArrival: true, rating: 4.6, reviewCount: 56,
    tags: ['chanderi','lightweight','office','casual'], length: '6.3m', blouseIncluded: false,
  },
  {
    name: 'Georgette Floral Embroidered',
    description: 'Elegant georgette saree with intricate floral embroidery. Light and flowy fabric ideal for parties and celebrations. Features sequin and thread work.',
    category: 'Georgette', fabric: 'Georgette', origin: 'Surat, Gujarat',
    occasion: ['Party','Festive'], colors: ['Pink','Rose Gold','Silver'],
    price: 6800, originalPrice: 8500,
    images: ['https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&q=85'],
    stock: 30, newArrival: true, rating: 4.3, reviewCount: 78,
    tags: ['georgette','embroidered','party','floral'], length: '6m', blouseIncluded: true,
  },
  {
    name: 'Paithani Peacock Silk',
    description: 'Authentic Paithani saree from Yeola, Maharashtra. Handwoven with real gold and silver zari. Features the iconic peacock and lotus motifs on a rich silk base.',
    category: 'Paithani', fabric: 'Pure Silk with Zari', origin: 'Yeola, Maharashtra',
    occasion: ['Wedding','Bridal','Festive'], colors: ['Green','Gold','Red'],
    price: 42000, originalPrice: 50000,
    images: ['https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=85'],
    stock: 5, featured: true, rating: 4.9, reviewCount: 43,
    tags: ['paithani','authentic','peacock','maharashtra','luxury'], length: '6.3m', blouseIncluded: true,
  },
  {
    name: 'Chiffon Ombre Gradient',
    description: 'Contemporary ombre chiffon saree with a beautiful gradient from dusty rose to deep maroon. Perfect blend of modern aesthetics and classic draping.',
    category: 'Chiffon', fabric: 'Chiffon', origin: 'Surat, Gujarat',
    occasion: ['Party','Casual'], colors: ['Rose','Maroon','Pink'],
    price: 4200,
    images: ['https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&q=70'],
    stock: 45, newArrival: true, rating: 4.2, reviewCount: 91,
    tags: ['chiffon','ombre','casual','modern'], length: '6m', blouseIncluded: false,
  },
  {
    name: 'Bandhani Rajasthani Silk',
    description: 'Traditional tie-and-dye Bandhani saree from Rajasthan. Each saree takes 3–4 days to hand-tie thousands of tiny dots. Vibrant colours with authentic Bandhani patterns.',
    category: 'Bandhani', fabric: 'Silk', origin: 'Jaipur, Rajasthan',
    occasion: ['Festive','Casual','Party'], colors: ['Yellow','Red','Green','Blue'],
    price: 7200,
    images: ['https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=600&q=70'],
    stock: 18, rating: 4.4, reviewCount: 62,
    tags: ['bandhani','rajasthani','tie-dye','traditional'], length: '6.3m', blouseIncluded: true,
  },
  {
    name: 'Handloom Linen Striped',
    description: 'Pure handloom linen saree with natural subtle stripes. Breathable and comfortable for everyday wear. Zero synthetic fibres. Ideal for office or casual outings.',
    category: 'Linen', fabric: 'Pure Linen', origin: 'Bishnupur, West Bengal',
    occasion: ['Office','Casual'], colors: ['Beige','Brown','White'],
    price: 3800,
    images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=70'],
    stock: 35, rating: 4.5, reviewCount: 107,
    tags: ['linen','handloom','office','casual','natural'], length: '6.3m', blouseIncluded: false,
  },
  {
    name: 'Pochampally Ikat Double Weave',
    description: 'Traditional Pochampally Ikat saree with geometric patterns formed by resist-dyeing the threads before weaving. GI-certified authentic craft from Telangana.',
    category: 'Ikat', fabric: 'Silk Cotton', origin: 'Pochampally, Telangana',
    occasion: ['Festive','Party','Office'], colors: ['Teal','Navy','Gold'],
    price: 11500,
    images: ['https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=70'],
    stock: 12, featured: true, rating: 4.7, reviewCount: 38,
    tags: ['ikat','pochampally','geometric','telangana','gi-certified'], length: '6.3m', blouseIncluded: true,
  },
  {
    name: 'Mysore Crepe Silk',
    description: 'Pure Mysore crepe silk saree with a natural lustre and smooth texture. Lightweight and easy to drape. Features hand-painted gold motifs along the border.',
    category: 'Mysore Silk', fabric: 'Crepe Silk', origin: 'Mysore, Karnataka',
    occasion: ['Party','Festive','Office'], colors: ['Mint','Gold','Cream'],
    price: 9800,
    images: ['https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&q=60'],
    stock: 20, newArrival: true, rating: 4.6, reviewCount: 51,
    tags: ['mysore','silk','crepe','south-india','GI-certified'], length: '6.3m', blouseIncluded: true,
  },
  {
    name: 'Net Sequin Embellished',
    description: 'Glamorous net saree with heavy sequin and cutwork embroidery. Fully lined with satin. A showstopper for evening events, sangeet, and receptions.',
    category: 'Net', fabric: 'Net with Satin Lining', origin: 'Surat, Gujarat',
    occasion: ['Party','Wedding'], colors: ['Black','Gold','Silver'],
    price: 13500, originalPrice: 16000,
    images: ['https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&q=70'],
    stock: 10, bestseller: true, rating: 4.5, reviewCount: 72,
    tags: ['net','sequin','party','evening','embellished'], length: '6m', blouseIncluded: true,
  },
  {
    name: 'Uppada Jamdani Pure Silk',
    description: 'Exquisite Uppada Jamdani silk saree from Andhra Pradesh. Ultra-lightweight pure silk with intricate woven floral motifs. GI-certified handloom weave.',
    category: 'Uppada', fabric: 'Pure Silk', origin: 'Uppada, Andhra Pradesh',
    occasion: ['Festive','Party','Wedding'], colors: ['Blue','Gold','Cream'],
    price: 16800,
    images: ['https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=600&q=60'],
    stock: 7, featured: true, newArrival: true, rating: 4.8, reviewCount: 29,
    tags: ['uppada','jamdani','andhra','handloom','gi-certified'], length: '6.3m', blouseIncluded: true,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅  Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    console.log('🗑️   Cleared existing data');

    // Create admin
    const admin = await User.create({
      name: 'Vastra Admin',
      email: 'admin@vastrav.com',
      password: 'Admin@123',
      role: 'admin',
      phone: '9000000000',
    });
    console.log(`👑  Admin created: ${admin.email} / Admin@123`);

    // Create demo user
    const user = await User.create({
      name: 'Priya Sharma',
      email: 'priya@example.com',
      password: 'User@123',
      phone: '9876543210',
      addresses: [{
        label: 'Home', name: 'Priya Sharma', phone: '9876543210',
        street: '14, Jubilee Hills Road 36', city: 'Hyderabad',
        state: 'Telangana', pincode: '500033', isDefault: true,
      }],
    });
    console.log(`👤  Demo user created: ${user.email} / User@123`);

    // Create products
    const created = await Product.insertMany(products);
    console.log(`🛍️   ${created.length} products seeded`);

    console.log('\n✨  Seed complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Admin:   admin@vastrav.com / Admin@123');
    console.log('  User:    priya@example.com / User@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (err) {
    console.error('❌  Seed failed:', err.message);
    process.exit(1);
  }
}

seed();

// Also seed categories
const Category = require('./models/Category');
const HomeConfig = require('./models/HomeConfig');

async function seedExtras() {
  await Category.deleteMany({});
  const defaultCategories = [
    { name: 'Banarasi', description: 'Handwoven silk sarees from Varanasi with intricate zari work', image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&q=80', sortOrder: 1 },
    { name: 'Kanjivaram', description: 'Temple-border silk from Kanchipuram, Tamil Nadu', image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=600&q=80', sortOrder: 2 },
    { name: 'Chanderi', description: 'Sheer silk-cotton blend from Chanderi, Madhya Pradesh', image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80', sortOrder: 3 },
    { name: 'Georgette', description: 'Light, flowing fabric ideal for parties', image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80', sortOrder: 4 },
    { name: 'Paithani', description: 'Royal Maharashtrian silk with peacock motifs', image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&q=80', sortOrder: 5 },
    { name: 'Chiffon', description: 'Lightweight modern fabric for casual wear', image: '', sortOrder: 6 },
    { name: 'Bandhani', description: 'Traditional Rajasthani tie-dye', image: '', sortOrder: 7 },
    { name: 'Linen', description: 'Breathable natural fabric for everyday wear', image: '', sortOrder: 8 },
    { name: 'Ikat', description: 'GI-certified resist-dye weave from Telangana', image: '', sortOrder: 9 },
    { name: 'Mysore Silk', description: 'GI-certified pure silk from Karnataka', image: '', sortOrder: 10 },
    { name: 'Net', description: 'Embellished net sarees for evening events', image: '', sortOrder: 11 },
    { name: 'Uppada', description: 'Lightweight Jamdani silk from Andhra Pradesh', image: '', sortOrder: 12 },
  ];
  await Category.insertMany(defaultCategories);
  console.log(`🏷️   ${defaultCategories.length} categories seeded`);

  // Create default homepage config
  await HomeConfig.deleteMany({});
  await HomeConfig.create({ singleton: 'home' });
  console.log('🏠  Default homepage config created');
}

seedExtras().catch(console.error);
