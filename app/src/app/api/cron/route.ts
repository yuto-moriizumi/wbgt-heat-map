import { NextResponse } from 'next/server';
import { fetchWbgtData } from '../../../lib/fetch-wbgt-data';

export async function GET() {
  try {
    await fetchWbgtData();
    console.log('Cron job: WBGT data refreshed at', new Date().toISOString());
    return NextResponse.json({ message: 'WBGT data refreshed successfully' });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Failed to refresh data' }, { status: 500 });
  }
}