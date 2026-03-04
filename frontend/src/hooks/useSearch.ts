import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/api/search';

export function useSearch(query: string, workspaceId: string) {
  return useQuery({
    queryKey: ['search', query, workspaceId],
    queryFn: () => searchApi.search(query, workspaceId),
    enabled: !!query && query.length >= 2 && !!workspaceId,
    staleTime: 30_000,
  });
}
