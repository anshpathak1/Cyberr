import { GeolocData } from '../types';
const CALLING_CODE_MAP: Record<string, string> = {
  IN: '+91',
  US: '+1',
  GB: '+44',
  CA: '+1',
  AU: '+61',
  FR: '+33',
  DE: '+49',
  IT: '+39',
  ES: '+34',
  RU: '+7',
  CN: '+86',
  JP: '+81',
  KR: '+82',
  PK: '+92',
  BD: '+880',
  NP: '+977',
  LK: '+94',
  AE: '+971',
  SA: '+966',
  SG: '+65',
  MY: '+60',
  TH: '+66',
  BR: '+55',
  MX: '+52',
  ZA: '+27'
};
const CURRENCY_MAP: Record<string, { code: string; name: string }> = {
  IN: { code: 'INR', name: 'Indian Rupee' },
  US: { code: 'USD', name: 'US Dollar' },
  GB: { code: 'GBP', name: 'British Pound' },
  CA: { code: 'CAD', name: 'Canadian Dollar' },
  AU: { code: 'AUD', name: 'Australian Dollar' },
  DE: { code: 'EUR', name: 'Euro' },
  FR: { code: 'EUR', name: 'Euro' },
  JP: { code: 'JPY', name: 'Japanese Yen' },
  CN: { code: 'CNY', name: 'Chinese Yuan' },
  PK: { code: 'PKR', name: 'Pakistani Rupee' },
  BD: { code: 'BDT', name: 'Bangladeshi Taka' },
  NP: { code: 'NPR', name: 'Nepalese Rupee' },
  AE: { code: 'AED', name: 'UAE Dirham' },
  SG: { code: 'SGD', name: 'Singapore Dollar' },
  KR: { code: 'KRW', name: 'South Korean Won' },
  RU: { code: 'RUB', name: 'Russian Ruble' },
  SA: { code: 'SAR', name: 'Saudi Riyal' },
  MY: { code: 'MYR', name: 'Malaysian Ringgit' },
  TH: { code: 'THB', name: 'Thai Baht' },
  BR: { code: 'BRL', name: 'Brazilian Real' },
  MX: { code: 'MXN', name: 'Mexican Peso' },
  ZA: { code: 'ZAR', name: 'South African Rand' },
};
function getCurrency(countryCode?: string) {
  return CURRENCY_MAP[countryCode || 'US'] || CURRENCY_MAP.US;
}
function getCallingCode(countryCode?: string, apiValue?: string) {
    if (apiValue && apiValue !== '+1')
        return apiValue;

    if (!countryCode)
        return '+1';

    return CALLING_CODE_MAP[countryCode.toUpperCase()] || '+1';
}

export function isValidIp(ip: string): boolean {
  const trimmed = ip.trim();
  if (!trimmed) return false;
  
  // Basic IPv4 regex
  const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // Basic IPv6 check
  const hasColon = trimmed.includes(':');
  if (hasColon) {
    // Basic structural validation for IPv6
    return trimmed.split(':').length >= 3 && /^[0-9a-fA-F:]+$/.test(trimmed);
  }
  
  return ipv4Regex.test(trimmed);
}

function parseIpwhois(data: any): GeolocData {
  return {
    ip: data.ip,
    type: data.type || (data.ip.includes(':') ? 'IPv6' : 'IPv4'),
    country: data.country || 'Unknown',
    countryCode: data.country_code || 'US',
    countryFlag: data.country_flag || `https://flagcdn.com/${(data.country_code || 'us').toLowerCase()}.svg`,
    city: data.city || 'Unknown',
    region: data.region || 'Unknown',
    timezone: data.timezone?.id || 'UTC',
    utcOffset: data.timezone?.utc || '+00:00',
    isp: data.connection?.isp || data.isp || 'Unknown Ext Provider',
    asn: data.connection?.asn ? `AS${data.connection.asn}` : 'Unknown',
    org: data.connection?.org || data.org || 'Unknown Org',
    latitude: typeof data.latitude === 'number' ? data.latitude : parseFloat(data.latitude || '0'),
    longitude: typeof data.longitude === 'number' ? data.longitude : parseFloat(data.longitude || '0'),
    currency: getCurrency(data.country_code).name,
currencyCode: getCurrency(data.country_code).code,
    callingCode: getCallingCode(data.country_code, data.country_phone),
  };
}

function parseIpapi(data: any): GeolocData {
  return {
    ip: data.ip,
    type: data.ip.includes(':') ? 'IPv6' : 'IPv4',
    country: data.country_name || 'Unknown',
    countryCode: data.country || 'US',
    countryFlag: `https://flagcdn.com/${(data.country || 'us').toLowerCase()}.svg`,
    city: data.city || 'Unknown',
    region: data.region || 'Unknown',
    timezone: data.timezone || 'UTC',
    utcOffset: data.utc_offset || '+0000',
    isp: data.org || 'Unknown Ext Provider',
    asn: data.asn || 'Unknown',
    org: data.org || 'Unknown Org',
    latitude: typeof data.latitude === 'number' ? data.latitude : parseFloat(data.latitude || '0'),
    longitude: typeof data.longitude === 'number' ? data.longitude : parseFloat(data.longitude || '0'),
    currency: getCurrency(data.country).name,
currencyCode: getCurrency(data.country).code,
    callingCode: getCallingCode(data.country, data.country_calling_code),
  };
}

export async function fetchIpData(ip?: string): Promise<GeolocData> {
  const targetIp = ip ? ip.trim() : '';
  
  // Try IPWhois first (highly detailed and flag support)
  try {
    const url = targetIp ? `https://ipwho.is/${targetIp}` : 'https://ipwho.is/';
    const response = await fetch(url, { method: 'GET', mode: 'cors' });
    
    if (!response.ok) {
      throw new Error(`IPWhois returned HTTP status ${response.status}`);
    }
    
    const data = await response.json();
    if (data.success === false) {
      throw new Error(data.message || 'Invalid IP lookup response');
    }
    
    return parseIpwhois(data);
  } catch (error: any) {
    console.warn('IPWhois failed, falling back to ipapi.co:', error.message);
    
    // Fallback to ipapi.co
    try {
      const url = targetIp ? `https://ipapi.co/${targetIp}/json/` : 'https://ipapi.co/json/';
      const response = await fetch(url, { method: 'GET', mode: 'cors' });
      
      if (!response.ok) {
        throw new Error(`ipapi.co returned HTTP status ${response.status}`);
      }
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.reason || 'IP Lookup failed at secondary API');
      }
      
      return parseIpapi(data);
    } catch (fallbackError: any) {
      console.error('All GeoIP APIs failed:', fallbackError.message);
      throw new Error(`Failed to resolve IP location: ${fallbackError.message}`);
    }
  }
}
