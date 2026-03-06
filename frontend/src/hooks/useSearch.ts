import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/api/search';
import type { SearchFilters } from '@/api/search';

export function useSearch(query: string, workspaceId: string, filters?: SearchFilters) {
  return useQuery({
    queryKey: ['search', query, workspaceId, filters],
    queryFn: () => searchApi.search(query, workspaceId, filters),
    enabled: !!query && query.length >= 2 && !!workspaceId,
    staleTime: 30_000,
  });
}
