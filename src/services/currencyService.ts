/**
 * Currency Service for fetching exchange rates
 * Focusing on IQD (Iraqi Dinar) and USD (US Dollar)
 */

interface ExchangeRateResponse {
  result: string;
  base_code: string;
  rates: { [key: string]: number };
  time_last_update_unix: number;
}

export const OFFICIAL_CBI_RATE = 1310; // Official Central Bank of Iraq rate
export const MARKET_RATE_FALLBACK = 1500; // General market fallback

/**
 * Fetches the current exchange rate from USD to IQD
 * Since we need an API key for most production services, 
 * we use a public free endpoint or fallback logic.
 */
export async function fetchIqdRate(): Promise<number> {
  try {
    // Open Exchange Rate Public API (Free/No Key for latest)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data: ExchangeRateResponse = await response.json();
    
    if (data && data.rates && data.rates['IQD']) {
      return data.rates['IQD'];
    }
    return MARKET_RATE_FALLBACK;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return MARKET_RATE_FALLBACK;
  }
}
