const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Generic fetch wrapper with error handling
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface Student {
  id: number;
  name: string;
  email: string;
  phone?: string;
  cgpa?: number;
  skills: string[];
  internships: string[];
  projects: any[];
  placed: boolean;
  created: string;
}

export interface Placement {
  id: number;
  student_id: number;
  company: string;
  role: string;
  package: number;
  status: "applied" | "interview" | "offered" | "joined" | "rejected";
  placed_date: string;
}

export interface Stats {
  total_students: number;
  placed_count: number;
  placement_rate: number;
  avg_cgpa: number;
  avg_package: number;
  top_companies: Array<{ name: string; count: number; avg_package: number }>;
  skill_demand: Record<string, number>;
}

// Students API
export const studentsApi = {
  getAll: (params?: {
    search?: string;
    min_cgpa?: number;
    skill?: string;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.min_cgpa) query.set("min_cgpa", params.min_cgpa.toString());
    if (params?.skill) query.set("skill", params.skill);
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.offset) query.set("offset", params.offset.toString());

    return apiFetch<Student[]>(`/students?${query.toString()}`);
  },

  getById: (id: number) => apiFetch<Student>(`/students/${id}`),

  create: (data: Omit<Student, "id" | "created">) =>
    apiFetch<{ id: number }>("/students", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<Student>) =>
    apiFetch<{ status: string }>(`/students/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<{ status: string }>(`/students/${id}`, {
      method: "DELETE",
    }),
};

// Placements API
export const placementsApi = {
  getAll: (params?: { company?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.company) query.set("company", params.company);
    if (params?.status) query.set("status", params.status);

    return apiFetch<Placement[]>(`/placements?${query.toString()}`);
  },

  getByStudent: (studentId: number) =>
    apiFetch<Placement[]>(`/students/${studentId}/placements`),

  create: (data: Omit<Placement, "id" | "placed_date">) =>
    apiFetch<{ id: number; placed_date: string }>("/placements", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateStatus: (id: number, status: Placement["status"]) =>
    apiFetch<{ status: string }>(`/placements/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

// Stats API
export const statsApi = {
  get: () => apiFetch<Stats>("/stats"),
};
