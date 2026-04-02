/**
 * Simpler.Grants.gov API client
 * @see https://api.simpler.grants.gov
 */

const BASE_URL = 'https://api.simpler.grants.gov';

/** Base URL for viewing an opportunity on Simpler.Grants.gov */
export const OPPORTUNITY_VIEW_BASE = 'https://simpler.grants.gov/opportunity';

/** Single opportunity (grant) from the API */
export interface GrantsGovOpportunity {
  opportunity_id?: string;
  opportunity_number?: string;
  opportunity_title: string;
  summary?: {
    post_date?: string;
    close_date?: string | null;
    award_ceiling?: number;
    award_floor?: number;
    summary_description?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Returns the public URL for an opportunity, or null if no ID */
export function getOpportunityUrl(opp: GrantsGovOpportunity): string | null {
  const id = opp.opportunity_id;
  return id ? `${OPPORTUNITY_VIEW_BASE}/${id}` : null;
}

/** Build a plain-text context string for RAG from an opportunity (search result or full GET). */
export function buildGrantContext(opp: GrantsGovOpportunity): string {
  const s = opp.summary as Record<string, unknown> | undefined;
  const postDate = s?.post_date ?? (opp as Record<string, unknown>).post_date;
  const closeDate = s?.close_date ?? (opp as Record<string, unknown>).close_date;
  const ceiling = s?.award_ceiling ?? (opp as Record<string, unknown>).award_ceiling;
  const floor = s?.award_floor ?? (opp as Record<string, unknown>).award_floor;
  const summaryDesc = s?.summary_description ?? (opp as Record<string, unknown>).summary_description;
  const parts: string[] = [
    `Title: ${opp.opportunity_title ?? ''}`,
    opp.opportunity_number ? `Opportunity Number: ${opp.opportunity_number}` : '',
    (opp as Record<string, unknown>).agency_name ? `Agency: ${(opp as Record<string, unknown>).agency_name}` : '',
    postDate ? `Posted: ${postDate}` : '',
    closeDate ? `Close Date: ${closeDate}` : '',
    ceiling != null ? `Award Ceiling: ${ceiling}` : '',
    floor != null ? `Award Floor: ${floor}` : '',
    Array.isArray((opp as Record<string, unknown>).applicant_types)
      ? `Applicant Types: ${((opp as Record<string, unknown>).applicant_types as string[]).join(', ')}`
      : '',
    summaryDesc ? `Summary: ${summaryDesc}` : '',
  ].filter(Boolean);
  return parts.join('\n');
}

/** Response from the search endpoint */
export interface SearchOpportunitiesResponse {
  data: GrantsGovOpportunity[];
  [key: string]: unknown;
}

/** Filters for the search request */
export interface SearchFilters {
  opportunity_status?: { one_of: string[] };
  applicant_type?: { one_of: string[] };
  [key: string]: unknown;
}

/** Sort order entry */
export interface SortOrderItem {
  order_by: string;
  sort_direction: 'ascending' | 'descending';
}

/** Pagination options */
export interface SearchPagination {
  page_offset: number;
  page_size: number;
  sort_order?: SortOrderItem[];
}

/** Payload for POST /v1/opportunities/search */
export interface SearchOpportunitiesPayload {
  query: string;
  filters?: SearchFilters;
  pagination: SearchPagination;
}

/** Default search payload; can be overridden per call */
const defaultSearchPayload: Omit<SearchOpportunitiesPayload, 'query'> = {
  filters: {
    opportunity_status: { one_of: ['posted'] },
    applicant_type: { one_of: ['nonprofits_non_higher_education_with_501c3', 'state_governments'] },
  },
  pagination: {
    page_offset: 1,
    page_size: 10,
    sort_order: [
      { order_by: 'close_date', sort_direction: 'ascending' },
    ],
  },
};

function getApiKey(): string {
  const key =
    import.meta.env.VITE_GRANT_API ||
    import.meta.env.VITE_GRANTS_API_KEY ||
    import.meta.env.VITE_SIMPLER_GRANTS_API_KEY;
  if (!key || typeof key !== 'string') {
    throw new Error('Missing Grants API key. Add VITE_GRANT_API (or VITE_GRANTS_API_KEY) to your frontend .env and restart Vite.');
  }
  return key;
}

export function isGrantApiConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_GRANT_API ||
    import.meta.env.VITE_GRANTS_API_KEY ||
    import.meta.env.VITE_SIMPLER_GRANTS_API_KEY
  );
}

/**
 * Search grant opportunities via simpler.grants.gov API.
 * Uses browser fetch (no node-fetch). API key from VITE_GRANT_API.
 */
export async function searchOpportunities(
  options: {
    query: string;
    filters?: SearchFilters;
    pagination?: Partial<SearchPagination>;
  }
): Promise<SearchOpportunitiesResponse> {
  const { query, filters, pagination } = options;

  const searchPayload: SearchOpportunitiesPayload = {
    query: query.trim() || 'education',
    filters: filters ?? defaultSearchPayload.filters,
    pagination: {
      ...defaultSearchPayload.pagination,
      ...pagination,
    },
  };

  const response = await fetch(`${BASE_URL}/v1/opportunities/search`, {
    method: 'POST',
    headers: {
      'X-API-Key': getApiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(searchPayload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Grants.gov API error: ${response.status} ${response.statusText}. ${text}`);
  }

  const data = (await response.json()) as SearchOpportunitiesResponse;
  return data;
}

/**
 * Fetch full opportunity details by ID (for RAG context).
 * GET /v1/opportunities/{opportunity_id}
 */
export async function getOpportunityById(opportunityId: string): Promise<GrantsGovOpportunity> {
  const response = await fetch(`${BASE_URL}/v1/opportunities/${encodeURIComponent(opportunityId)}`, {
    method: 'GET',
    headers: {
      'X-API-Key': getApiKey(),
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Grants.gov API error: ${response.status} ${response.statusText}. ${text}`);
  }

  return (await response.json()) as GrantsGovOpportunity;
}
