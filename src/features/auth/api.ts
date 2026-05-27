import { api } from "@/lib/axios"

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access: string; refresh: string }>("/auth/login/", { email, password }),
  register: (data: object) => api.post("/auth/register/", data),
  getProfile: () => api.get("/auth/profile/"),
  updateProfile: (data: object) => api.patch("/auth/profile/", data),
}
