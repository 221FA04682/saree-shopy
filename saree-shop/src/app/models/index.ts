// Re-export from services to avoid duplication
export type { Product } from '../services/product.service';
export type { User, Address } from '../services/auth.service';
export type { Order, OrderItem, ShippingAddress } from '../services/order.service';
