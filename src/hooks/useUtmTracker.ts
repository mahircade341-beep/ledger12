import { useMemo } from 'react';

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  utm_id?: string;
  gclid?: string;
  fbclid?: string;
}

const STORAGE_KEY = 'dl-utm-data';

/**
 * Parse UTM and click ID parameters from a URL search string.
 */
function parseUtmFromSearch(search: string): UtmParams {
  const params = new URLSearchParams(search);
  const utm: UtmParams = {};

  const keys: (keyof UtmParams)[] = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'utm_id',
    'gclid',
    'fbclid',
  ];

  for (const key of keys) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }

  return utm;
}

/**
 * Persist UTM data to sessionStorage (silent, no overwrite of existing data
 * unless fresh params are found in the current URL).
 */
function persistUtm(): UtmParams {
  try {
    const fresh = parseUtmFromSearch(window.location.search);
    const hasFresh = Object.values(fresh).some((v) => v !== undefined);

    if (hasFresh) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }

    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as UtmParams;
    }
  } catch {
    // sessionStorage unavailable or corrupted — silently degrade
  }

  return {};
}

export interface UseUtmTrackerReturn {
  utm: UtmParams;
  hasUtm: boolean;
  toQueryString: () => string;
  appendToPayload: <T extends Record<string, unknown>>(payload: T) => T & { utm_data?: UtmParams };
}

/**
 * Hook that scans window.location.search for UTM parameters on mount,
 * persists them to sessionStorage, and provides retrieval utilities.
 */
export default function useUtmTracker(): UseUtmTrackerReturn {
  const utm = useMemo<UtmParams>(() => persistUtm(), []);

  const hasUtm = useMemo(
    () => Object.values(utm).some((v) => v !== undefined && v !== ''),
    [utm]
  );

  const toQueryString = (): string => {
    const entries = Object.entries(utm).filter(([, v]) => v !== undefined && v !== '');
    if (entries.length === 0) return '';
    return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&');
  };

  const appendToPayload = <T extends Record<string, unknown>>(
    payload: T
  ): T & { utm_data?: UtmParams } => {
    if (!hasUtm) return payload;
    return { ...payload, utm_data: utm };
  };

  return { utm, hasUtm, toQueryString, appendToPayload };
}
