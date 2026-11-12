import { App } from 'aws-cdk-lib';
import { OrdersStack } from '../lib/orders-stack';

const app = new App();
new OrdersStack(app, 'OrdersStack', { env: { account: '111111111111', region: 'us-east-1' } });
