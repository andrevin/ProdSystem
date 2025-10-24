import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

type UserWithoutPassword = Omit<User, "passwordHash">;

export function useUser() {
  return useQuery<UserWithoutPassword | null>({
    queryKey: ["/api/me"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (res.status === 401) {
          return null;
        }
        if (!res.ok) {
          throw new Error("Failed to fetch user");
        }
        return res.json();
      } catch (error) {
        return null;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

interface LoginData {
  email: string;
  password: string;
}

export function useLogin() {
  return useMutation({
    mutationFn: async (data: LoginData) => {
      const res = await apiRequest("POST", "/api/login", data);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout");
      return res;
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    },
  });
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export function useRegister() {
  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", data);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    },
  });
}
