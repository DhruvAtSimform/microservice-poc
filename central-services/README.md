# Central Services

This directory contains shared infrastructure services used by all microservices in the system.

## Services

### RabbitMQ Message Broker

RabbitMQ is used for event-driven communication between microservices, implementing the Saga pattern with compensating transactions.

#### Quick Start

```bash
# Start RabbitMQ
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f rabbitmq

# Stop RabbitMQ
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

#### Access Points

- **AMQP Protocol**: `amqp://localhost:5672`
- **Management UI**: http://localhost:15672
  - Username: `admin`
  - Password: `admin123`

#### Pre-configured Resources

##### Exchanges

- `orders.exchange` (topic) - Order-related events
- `products.exchange` (topic) - Product-related events
- `order-feedback.exchange` (topic) - Feedback channel for saga compensation

##### Queues

- `orders.created` - New orders
- `orders.confirmed` - Confirmed orders
- `orders.cancelled` - Cancelled orders
- `orders.failed` - Failed orders
- `products.created` - New products
- `products.updated` - Updated products
- `order-feedback` - Saga feedback channel (inventory, payment results)
- `product.events` - All product events
- `order.events` - All order events

##### Routing Keys

- `order.*` - All order events
- `order.created` - Order created
- `order.confirmed` - Order confirmed
- `order.cancelled` - Order cancelled
- `order.failed` - Order failed
- `order.compensation.requested` - Trigger compensation
- `product.*` - All product events
- `product.created` - Product created
- `product.updated` - Product updated
- `inventory.*` - All inventory events
- `inventory.reserved` - Inventory reserved
- `inventory.reservation.failed` - Inventory reservation failed
- `inventory.released` - Inventory released (compensation)
- `payment.*` - All payment events (future)

#### Configuration

##### Environment Variables

Default credentials are set in `docker-compose.yml`:

- `RABBITMQ_DEFAULT_USER=admin`
- `RABBITMQ_DEFAULT_PASS=admin123`

To change credentials:

1. Update `docker-compose.yml`
2. Update `definitions.json` (regenerate password hash)
3. Update `.env` files in both microservices

##### Custom Configuration

Edit `rabbitmq.conf` to customize:

- Memory limits
- Disk space thresholds
- Connection settings
- Logging preferences

##### Pre-defined Resources

Edit `definitions.json` to modify:

- Exchanges
- Queues
- Bindings
- Policies
- User permissions

#### Connecting from Microservices

Update your service `.env` file:

```bash
# orders-service/.env or product-service/.env
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
RABBITMQ_ORDERS_EXCHANGE=orders.exchange
RABBITMQ_PRODUCTS_EXCHANGE=products.exchange
RABBITMQ_FEEDBACK_EXCHANGE=order-feedback.exchange
RABBITMQ_ORDER_FEEDBACK_QUEUE=order-feedback
```

#### Health Check

```bash
# Using Docker
docker exec microservices-rabbitmq rabbitmq-diagnostics ping

# Using Management API
curl -u admin:admin123 http://localhost:15672/api/healthchecks/node

# Check if service is ready
docker exec microservices-rabbitmq rabbitmq-diagnostics check_running
```

#### Monitoring

##### Via Management UI

1. Open http://localhost:15672
2. Login with `admin` / `admin123`
3. Navigate to:
   - **Overview**: System metrics
   - **Connections**: Active connections
   - **Channels**: Active channels
   - **Exchanges**: Exchange list and bindings
   - **Queues**: Queue list, messages, and consumers

##### Via CLI

```bash
# List queues with messages
docker exec microservices-rabbitmq rabbitmqctl list_queues name messages messages_ready messages_unacknowledged

# List exchanges
docker exec microservices-rabbitmq rabbitmqctl list_exchanges name type

# List bindings
docker exec microservices-rabbitmq rabbitmqctl list_bindings

# List connections
docker exec microservices-rabbitmq rabbitmqctl list_connections

# List consumers
docker exec microservices-rabbitmq rabbitmqctl list_consumers
```

#### Troubleshooting

##### Container won't start

```bash
# Check logs
docker-compose logs rabbitmq

# Remove existing container and volumes
docker-compose down -v

# Start fresh
docker-compose up -d
```

##### Cannot connect from microservices

1. Verify RabbitMQ is running: `docker-compose ps`
2. Check network connectivity: `docker network inspect central-services_microservices-network`
3. Verify credentials in `.env` files match `docker-compose.yml`
4. Check firewall rules allow port 5672

##### Messages not being consumed

1. Check consumer is connected: Management UI → Queues → Select queue → Consumers
2. Verify routing keys match between publisher and bindings
3. Check queue bindings: Management UI → Exchanges → Select exchange → Bindings
4. View message details in Management UI → Queues → Get messages

##### Out of memory

1. Check memory usage: Management UI → Overview
2. Adjust memory watermark in `rabbitmq.conf`
3. Increase Docker memory limit: `docker-compose.yml` → resources.limits.memory

#### Performance Tuning

##### For Development

Current settings are optimized for development with moderate persistence.

##### For Production

Consider these changes in `rabbitmq.conf`:

```conf
# Increase channel limit
channel_max = 4096

# Adjust memory watermark
vm_memory_high_watermark.relative = 0.6

# Enable lazy queues for large message backlogs
queue_master_locator = min-masters

# Adjust prefetch for consumers
consumer_prefetch = 100
```

#### Data Persistence

RabbitMQ data is persisted in a Docker volume:

- Volume name: `central-services_rabbitmq_data`
- Data location: `/var/lib/rabbitmq` (inside container)

To backup:

```bash
# Create backup
docker exec microservices-rabbitmq rabbitmqctl export_definitions /tmp/backup.json
docker cp microservices-rabbitmq:/tmp/backup.json ./backup-$(date +%Y%m%d).json

# Restore backup
docker cp ./backup.json microservices-rabbitmq:/tmp/backup.json
docker exec microservices-rabbitmq rabbitmqctl import_definitions /tmp/backup.json
```

#### Security Notes

⚠️ **Important for Production:**

1. Change default credentials
2. Use strong passwords
3. Enable TLS/SSL for connections
4. Restrict network access
5. Use separate vhosts per environment
6. Implement proper user permissions

#### Docker Network

The `microservices-network` bridge network allows microservices to communicate with RabbitMQ.

To connect a microservice to this network:

```yaml
# In microservice's docker-compose.yml
networks:
  default:
    external: true
    name: central-services_microservices-network
```

Or run services with:

```bash
docker run --network central-services_microservices-network your-service
```

#### Useful Commands

```bash
# Start in foreground (see logs immediately)
docker-compose up

# Restart RabbitMQ
docker-compose restart rabbitmq

# View resource usage
docker stats microservices-rabbitmq

# Execute RabbitMQ commands
docker exec -it microservices-rabbitmq bash

# Purge all queues (destructive!)
docker exec microservices-rabbitmq rabbitmqctl purge_queue order-feedback

# Reset RabbitMQ (removes all data!)
docker exec microservices-rabbitmq rabbitmqctl reset
```

#### Integration with Microservices

Both `orders-service` and `product-service` are configured to connect to this RabbitMQ instance.

Connection flow:

1. RabbitMQ starts and creates all exchanges, queues, and bindings
2. Microservices connect using credentials from `.env`
3. Services publish events to appropriate exchanges
4. Services consume events from subscribed queues
5. Saga orchestration happens via `order-feedback` queue

See [REVERSE_SAGA_PATTERN.md](../REVERSE_SAGA_PATTERN.md) for detailed architecture.

---

**Status**: ✅ Ready to Use | 🚀 Production Configuration Available
