import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { CognitoUserPoolsAuthorizer, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Table, AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export class OrdersStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const table = new Table(this, 'OrdersTable', {
      partitionKey: { name: 'orderId', type: AttributeType.STRING },
    });

    const exportsBucket = new Bucket(this, 'ExportsBucket', {
      publicReadAccess: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ACLS_ONLY,
    });

    const userPool = new UserPool(this, 'UserPool');
    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', { cognitoUserPools: [userPool] });

    const createOrder = new NodejsFunction(this, 'CreateOrder', {
      entry: 'src/handlers/create-order.ts',
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(10),
      environment: { TABLE_NAME: table.tableName },
    });
    table.grantReadWriteData(createOrder);

    const cancelOrder = new NodejsFunction(this, 'CancelOrder', {
      entry: 'src/handlers/cancel-order.ts',
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.minutes(15),
      environment: { TABLE_NAME: table.tableName, BUCKET_NAME: exportsBucket.bucketName },
    });

    cancelOrder.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['dynamodb:*'],
        resources: [table.tableArn],
      }),
    );
    cancelOrder.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:PutObject', 's3:GetObject'],
        resources: ['*'],
      }),
    );

    const api = new RestApi(this, 'OrdersApi');
    const orders = api.root.addResource('orders');
    orders.addMethod('POST', new LambdaIntegration(createOrder), {
      authorizer,
    });
    orders.addResource('{orderId}').addResource('cancel').addMethod('POST', new LambdaIntegration(cancelOrder));
  }
}
