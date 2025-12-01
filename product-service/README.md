# Product Microservice

A microservice built with **Clean Architecture** and **Domain-Driven Design** principles, implementing the **SAGA pattern** for distributed transactions.

## Architecture Overview

### Layer Structure

```
src/
├── domain/              # Core business logic (innermost layer)
│   ├── entities/        # Domain entities (Product)
│   ├── value-objects/   # Immutable value objects (ProductId, Money)
│   ├── interfaces/      # Repository and service ports
│   └── events/          # Domain events
│
├── application/         # Use cases and business workflows
│   ├── use-cases/       # Application use cases
│   ├── commands/        # SAGA commands
│   ├── sagas/           # SAGA orchestration logic
│   └── dto/             # Data transfer objects
│
├── presentation/        # External interface layer
│   ├── controllers/     # HTTP controllers
│   └── middleware/      # HTTP middleware
│
├── infrastructure/      # External implementations (outermost layer)
│   ├── persistence/     # Database implementations (Prisma)
│   ├── messaging/       # Event publisher implementations
│   ├── prisma/          # Prisma schema and configuration
│   └── config/          # DI container configuration
│
└── shared/              # Cross-cutting concerns
    ├── types/           # Shared types
    ├── utils/           # Utility functions
    └── errors/          # Error definitions
```

## Design Principles

### 1. Dependency Rule

- Dependencies point inward
- Inner layers define interfaces (ports)
- Outer layers provide implementations (adapters)

### 2. Domain-Driven Design

- **Entities**: Product with identity and lifecycle
- **Value Objects**: ProductId, Money (immutable)
- **Aggregates**: Product is the aggregate root
- **Domain Events**: ProductCreatedEvent, etc.

### 3. SAGA Pattern

- **Commands**: ReserveProductCommand
- **Saga Handlers**: ProductReservationSaga
- **Compensation**: Rollback support for distributed transactions

### 4. Dependency Injection

- Using `tsyringe` for IoC container
- Interfaces registered as tokens
- Implementations injected via constructor

## Key Components

### Domain Layer

- `Product` entity with business rules
- `ProductId`, `Money` value objects
- `IProductRepository`, `IEventPublisher` interfaces (ports)

### Application Layer

- `CreateProductUseCase` - orchestrates product creation
- `ProductReservationSaga` - handles SAGA transactions
- `ReserveProductCommand` - SAGA command

### Infrastructure Layer

- `PrismaProductRepository` - Prisma repository adapter for SQLite
- `InMemoryEventPublisher` - event publisher adapter
- `prisma.service.ts` - Prisma Client singleton with adapter
- `container.ts` - DI configuration

## Database

This service uses **Prisma ORM** with **SQLite** for data persistence:

- **Schema**: Located in `src/infrastructure/prisma/schema.prisma`
- **Migrations**: Stored in `src/infrastructure/prisma/migrations/`
- **Database**: SQLite file at `./data/dev.db`
- **Adapter**: Using `@prisma/adapter-better-sqlite3` for Prisma 7
- **Environment**: Configured via `.env` file with `DATABASE_URL`

### Prisma Scripts

```bash
pnpm run db:setup         # Generate client and push schema
pnpm run prisma:generate  # Generate Prisma Client
pnpm run prisma:push      # Push schema to database
pnpm run prisma:migrate   # Create and run migrations
pnpm run prisma:studio    # Open Prisma Studio
```

## Scripts

```bash
pnpm run dev          # Run in development mode
pnpm run build        # Compile TypeScript
pnpm run start        # Run compiled code
pnpm run lint         # Lint code
pnpm run lint:fix     # Fix linting issues
pnpm run format       # Format code
pnpm run type-check   # Type check without compiling
pnpm run check        # Run type-check and lint
```

## Technology Stack

- **Runtime**: Node.js 22.11 LTS
- **Language**: TypeScript (ESM)
- **Database**: SQLite with Prisma ORM 7
- **DI Container**: tsyringe
- **Architecture**: Clean Architecture + DDD
- **Pattern**: SAGA for distributed transactions
- **Path Aliases**: @domain, @application, @presentation, @infrastructure, @shared
