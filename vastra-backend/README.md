# Vastra Vaibhav — Backend API

Node.js + Express + MongoDB backend for Vastra Vaibhav premium saree shop.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env
# Edit .env and set your MONGO_URI and JWT_SECRET

# 3. Seed database (creates admin, demo user, 12 products)
node src/seed.js

# 4. Start server
npm run dev      # Development (with nodemon)
npm start        # Production
```

## Credentials (after seeding)
| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | admin@vastrav.com      | Admin@123  |
| User  | priya@example.com      | User@123   |

## API Endpoints

### Auth
| Method | Endpoint              | Access  | Description         |
|--------|-----------------------|---------|---------------------|
| POST   | /api/auth/register    | Public  | Create account      |
| POST   | /api/auth/login       | Public  | Login               |
| GET    | /api/auth/me          | User    | Get current user    |
| PUT    | /api/auth/me          | User    | Update profile      |
| POST   | /api/auth/address     | User    | Add address         |
| PUT    | /api/auth/address/:id | User    | Update address      |
| DELETE | /api/auth/address/:id | User    | Delete address      |
| POST   | /api/auth/wishlist/:id| User    | Toggle wishlist     |

### Products
| Method | Endpoint                      | Access  | Description           |
|--------|-------------------------------|---------|-----------------------|
| GET    | /api/products                 | Public  | List (filters, search)|
| GET    | /api/products/categories      | Public  | Get categories        |
| GET    | /api/products/:id             | Public  | Product detail        |
| GET    | /api/products/:id/related     | Public  | Related products      |
| POST   | /api/products                 | Admin   | Create product        |
| PUT    | /api/products/:id             | Admin   | Update product        |
| PATCH  | /api/products/:id/stock       | Admin   | Adjust stock          |
| DELETE | /api/products/:id             | Admin   | Soft delete           |
| POST   | /api/products/:id/review      | User    | Add review            |

### Orders
| Method | Endpoint                          | Access | Description              |
|--------|-----------------------------------|--------|--------------------------|
| POST   | /api/orders                       | User   | Place order (deducts stock)|
| GET    | /api/orders/my                    | User   | My orders                |
| GET    | /api/orders/my/:id                | User   | Order detail             |
| GET    | /api/orders/my/:id/shipping-label | User   | **Download PDF label**   |
| POST   | /api/orders/my/:id/cancel         | User   | Cancel (restores stock)  |
| GET    | /api/orders/admin/all             | Admin  | All orders               |
| GET    | /api/orders/admin/stats           | Admin  | Revenue & stats          |
| PUT    | /api/orders/admin/:id/status      | Admin  | Update status + tracking |

### Users (Admin)
| Method | Endpoint                       | Access | Description          |
|--------|--------------------------------|--------|----------------------|
| GET    | /api/users                     | Admin  | All users            |
| GET    | /api/users/stats               | Admin  | User statistics      |
| PATCH  | /api/users/:id/toggle-active   | Admin  | Activate/deactivate  |

### Upload (Admin)
| Method | Endpoint              | Access | Description         |
|--------|-----------------------|--------|---------------------|
| POST   | /api/upload/product   | Admin  | Upload product imgs |

## .env Configuration
```
MONGO_URI=mongodb://localhost:27017/vastra_vaibhav
JWT_SECRET=your_super_secret_key_here_at_least_32_chars
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:4200
SERVER_URL=http://localhost:5000
```

## MongoDB Atlas Setup
1. Create free cluster at mongodb.com/atlas
2. Add database user and whitelist IP (0.0.0.0/0 for dev)
3. Get connection string and set as MONGO_URI
