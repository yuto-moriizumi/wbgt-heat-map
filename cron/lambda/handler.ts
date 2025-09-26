import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    throw new Error('API_URL not set');
  }

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }
    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Cron executed successfully', data }),
    };
  } catch (error) {
    console.error('Error in cron Lambda:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to execute cron' }),
    };
  }
};