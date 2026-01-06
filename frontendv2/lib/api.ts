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
  final_cgpa?: number; // This will be computed from semester CGPAs
  skills: string[];
  internships: string[];
  projects: any[];
  placed: boolean;
  bio?: string;
  created: string;
}

export interface SemesterCGPA {
  semester: string;
  cgpa: number;
}

export interface PlacementDrive {
  id: number;
  company: string;
  status: "ongoing" | "completed" | "starting_soon";
  start_date?: string;
  end_date?: string;
  package?: number;
  description?: string;
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

// Placement Drives API
export const placementDrivesApi = {
  getAll: (params?: { company?: string; status?: string; limit?: number; cursor?: number }) => {
    const query = new URLSearchParams();
    if (params?.company) query.set("company", params.company);
    if (params?.status) query.set("status", params.status);
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.cursor) query.set("cursor", params.cursor.toString());

    return apiFetch<PlacementDrive[]>(`/placements?${query.toString()}`);
  },

  getById: (id: number) => apiFetch<PlacementDrive>(`/placements/${id}`),

  create: (data: Omit<PlacementDrive, "id">) =>
    apiFetch<{ id: number; status: string }>(`/placements`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<PlacementDrive>) =>
    apiFetch<{ status: string }>(`/placements/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<{ status: string }>(`/placements/${id}`, {
      method: "DELETE",
    }),
};

// Stats API
export const statsApi = {
  get: () => apiFetch<Stats>("/stats"),
};

// Semester CGPA API
export const semesterCGPA = {
  getAll: (studentId: number) => 
    apiFetch<SemesterCGPA[]>(`/students/${studentId}/cgpa`),

  add: (studentId: number, data: SemesterCGPA) =>
    apiFetch<{ status: string; student_id: number; semester: string; cgpa: number }>(`/students/${studentId}/cgpa`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (studentId: number, semester: string) =>
    apiFetch<{ status: string; student_id: number; semester: string }>(`/students/${studentId}/cgpa/${semester}`, {
      method: "DELETE",
    }),
};
