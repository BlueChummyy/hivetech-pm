import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, type UpdateProfileData, type ChangePasswordData } from '@/api/users';
import { useAuthStore } from '@/store/auth.store';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => usersApi.getMe(),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileData) => usersApi.updateMe(data),
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: ['users', 'me'] });
      useAuthStore.getState().setUser(user);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordData) => usersApi.changePassword(data),
  });
}

export function useSearchUsers(search?: string) {
  return useQuery({
    queryKey: ['users', { search }],
    queryFn: () => usersApi.list({ search }),
    enabled: search !== undefined,
  });
}
