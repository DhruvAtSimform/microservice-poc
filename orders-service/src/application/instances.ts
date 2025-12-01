/**
 * Application Layer Instances
 * Dependency injection container for application components
 */
import { CreateOrderSaga } from '@application/sagas/CreateOrderSaga.js';
import { CreateOrderUseCase } from '@application/use-cases/CreateOrderUseCase.js';
import { GetOrderByIdUseCase } from '@application/use-cases/GetOrderByIdUseCase.js';
import { GetOrdersByCustomerUseCase } from '@application/use-cases/GetOrdersByCustomerUseCase.js';
import { CreateOrderController } from '@presentation/controllers/CreateOrderController.js';
import { GetOrderByIdController } from '@presentation/controllers/GetOrderByIdController.js';
import { GetOrdersByCustomerController } from '@presentation/controllers/GetOrdersByCustomerController.js';
import { orderRepository, eventPublisher } from '@infrastructure/instances.js';

// Sagas
const createOrderSaga = new CreateOrderSaga(orderRepository, eventPublisher);

// Use Cases
const createOrderUseCase = new CreateOrderUseCase(createOrderSaga);
const getOrderByIdUseCase = new GetOrderByIdUseCase(orderRepository);
const getOrdersByCustomerUseCase = new GetOrdersByCustomerUseCase(orderRepository);

// Controllers
export const createOrderController = new CreateOrderController(createOrderUseCase);
export const getOrderByIdController = new GetOrderByIdController(getOrderByIdUseCase);
export const getOrdersByCustomerController = new GetOrdersByCustomerController(
  getOrdersByCustomerUseCase
);
