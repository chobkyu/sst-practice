import { StackContext, Api, StaticSite, Config, Table, Bucket } from 'sst/constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export function API({ stack }: StackContext) {

  const UploadsBucket = new Bucket(stack, 'Uploads', {
    cors: [
      {
        maxAge: '1 day',
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
        allowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      },
    ],
  });

  const CollectionsTable = new Table(stack, 'Collections', {
    fields: {
      collectionId: 'string',
      email: 'string',
    },
    primaryIndex: { partitionKey: 'collectionId' },
    globalIndexes: {
      emailIndex: { partitionKey: 'email' },
    },
  });

  const SENDER_EMAIL = new Config.Secret(stack, 'SENDER_EMAIL'); // api 위에 추가

  const TOSS_PAYMENTS_API_KEY = new Config.Secret(
    stack,
    'TOSS_PAYMENTS_API_KEY'
  );
  const BANANA_SECRET_KEY = new Config.Secret(stack, 'BANANA_SECRET_KEY');


  const api = new Api(stack, 'raymong_lecture', {
    cors: true,
    defaults: {
      function: {
        bind: [SENDER_EMAIL, CollectionsTable, UploadsBucket,TOSS_PAYMENTS_API_KEY, BANANA_SECRET_KEY,],
      },
    },
    routes: {
      'GET /{proxy+}': 'packages/functions/src/lambda.handler',
      'POST /{proxy+}': 'packages/functions/src/lambda.handler',
    },
  });

  api.attachPermissions([
    new iam.PolicyStatement({
      actions: ['ses:*'],
      effect: iam.Effect.ALLOW,
      resources: [
        // From AWS's SES console. You'll find a copy-pastable ARN
        // under "Verified identities"
        'arn:aws:ses:ap-northeast-2:377894444735:identity/qudqud97@naver.com', // SES에서 받은 ARN
      ],
    }),
  ]);


  const site = new StaticSite(stack, 'Site', {
    path: 'packages/web',
    environment: {
      // 앞에 VITE_를 붙여야 클라이언트에서 접근 가능
      VITE_API_URL: api.customDomainUrl || api.url,
      VITE_APP_URL: 'http://localhost:5173',
      VITE_TOSS_CLIENT_KEY: 'test_ck_jExPeJWYVQ4XPE7d5RWE349R5gvN',
    },
    buildOutput: 'dist',
    buildCommand: 'npm run build',
  });

  stack.addOutputs({
    ApiEndpoint: api.customDomainUrl || api.url,
    SiteUrl: site.customDomainUrl || site.url,
  });
}