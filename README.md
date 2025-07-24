# Task Runner (Depanneur Express)

A comprehensive multi-sided marketplace platform connecting clients with service providers, merchants, and delivery personnel.

## Features

### Phase 1: Core Infrastructure & User Foundation ✅
- Multi-role authentication (Client, Merchant, Driver, Admin)
- User profile management with avatar uploads
- Supabase integration for backend services
- Cross-platform support (iOS, Android, Web)

### Phase 2: Marketplace Core - Service Listing & Discovery ✅
- Service categories and management
- Service creation and listing for merchants
- Service discovery and browsing for clients
- Service booking and request management
- Basic review system

### Phase 3: Real-time Communication & Delivery System ✅
- Real-time messaging between clients and merchants
- Delivery management for drivers
- Location tracking and availability status
- Delivery request assignment and tracking

### Phase 4: Advanced Features & Admin Dashboard ✅
- Payment processing integration with Stripe
- Enhanced reviews and ratings system with voting and responses
- Comprehensive admin dashboard with user management
- Analytics and reporting system
- Support ticket system
- System settings and configuration management

### Phase 5: Internationalization and Deployment ✅
- Multi-language support (English, French, Spanish)
- Production deployment configuration
- Error boundaries and offline support
- Performance optimizations
- EAS Build configuration for app stores
- Automated deployment scripts
- Testing framework setup

### Upcoming Phases
- **Phase 6**: AI integration and advanced features
- **Phase 7**: Advanced analytics and business intelligence
- **Phase 8**: Mobile app store deployment

## Tech Stack

- **Frontend**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **Backend**: Supabase (Authentication, Database, Storage)
- **State Management**: React Context API
- **Storage**: AsyncStorage for session persistence

## Getting Started

### Prerequisites
- Node.js (v18 or later)
- Expo CLI
- Supabase account

### Setup

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Supabase**:
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Create a `.env` file based on `.env.example`
   - Run the database migrations in the Supabase SQL editor

3. **Start the development server**:
   ```bash
   # For mobile development
   npm start
   
   # For web development
   npm run start:web
   ```

### Database Setup

Run the following SQL migrations in your Supabase SQL editor:

1. `supabase/migrations/create_profiles_table.sql` - Creates user profiles table
2. `supabase/migrations/create_storage_buckets.sql` - Sets up file storage for avatars
3. `supabase/migrations/create_marketplace_tables.sql` - Creates marketplace tables (categories, services, requests, reviews)
4. `supabase/migrations/create_messaging_tables.sql` - Creates messaging system tables
5. `supabase/migrations/create_delivery_tables.sql` - Creates delivery system tables
6. `supabase/migrations/create_additional_storage_buckets.sql` - Additional storage buckets
7. `supabase/migrations/create_payment_tables.sql` - Payment and financial management
8. `supabase/migrations/enhance_reviews_system.sql` - Enhanced reviews with voting and responses
9. `supabase/migrations/create_analytics_tables.sql` - Analytics and reporting system
10. `supabase/migrations/create_admin_tables.sql` - Admin dashboard and management tools

## Project Structure

```
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   ├── (app)/             # Protected app screens
│   │   ├── services/      # Service management screens
│   │   ├── messages/      # Messaging screens
│   │   ├── requests/      # Request management screens
│   │   └── deliveries/    # Delivery management screens
│   │   ├── payments/      # Payment and billing screens
│   │   └── admin/         # Admin dashboard screens
│   └── _layout.tsx        # Root layout
├── src/
│   ├── contexts/          # React contexts
│   ├── components/        # Reusable components
│   └── lib/               # Utilities and configurations
├── supabase/
│   └── migrations/        # Database migrations
└── assets/                # Static assets
```

## User Roles

- **Client**: Browse and book services
- **Merchant**: Provide services and manage bookings
- **Driver**: Handle deliveries
- **Admin**: Platform management and oversight

## Environment Variables

Create a `.env` file with:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

## Payment Integration

The app includes Stripe integration for payment processing. To set up payments:

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your publishable key from the Stripe dashboard
3. Add it to your `.env` file
4. Configure webhook endpoints for payment status updates

## Development

- **Mobile**: Use Expo Go app to scan QR code
- **Web**: Automatically opens in browser
- **iOS Simulator**: Press `i` in terminal
- **Android Emulator**: Press `a` in terminal

## Contributing

**Completed Phases:**
- ✅ Phase 1: Core Infrastructure & User Foundation
- ✅ Phase 2: Marketplace Core - Service Listing & Discovery  
- ✅ Phase 3: Real-time Communication & Delivery System
- ✅ Phase 4: Advanced Features & Admin Dashboard

**Upcoming Phases:**
- Internationalization and localization
- Advanced AI features
- Performance optimization
- AI-powered features
- Mobile app store deployment

## License

Private project - All rights reserved