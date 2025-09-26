import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export class CronStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda function to call the Next.js cron endpoint
    const cronLambda = new lambda_nodejs.NodejsFunction(this, 'WbgtCronLambda', {
      entry: path.join(__dirname, '../lambda/handler.ts'),
      handler: 'handler',
      environment: {
        API_URL: 'https://your-app-domain.vercel.app/api/cron', // Replace with your actual deployed app URL
      },
    });

    // EventBridge Rule for daily cron job at 00:00 UTC
    const rule = new events.Rule(this, 'WbgtCronRule', {
      schedule: events.Schedule.cron({ minute: '0', hour: '0' }),
    });

    // Add Lambda as target
    rule.addTarget(new targets.LambdaFunction(cronLambda));
  }
}
