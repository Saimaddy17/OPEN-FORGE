export interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: Pick<User, "id" | "full_name" | "email" | "role">;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SubmissionInput {
  proposed_name: string;
  short_description: string;
  description: string | null;
  category_id: number;
  project_type: "source" | "installer";
  repository_url: string | null;
  official_website: string | null;
  download_url: string | null;
  license: string | null;
  version: string | null;
  logo_url: string | null;
}

export interface Submission {
  id: number;
  developer_id: number;
  application_id: number | null;
  proposed_name: string;
  short_description: string;
  description: string;
  category_id: number;
  repository_url: string | null;
  official_website: string | null;
  download_url: string | null;
  license: string | null;
  project_type: "source" | "installer";
  version: string | null;
  logo_url: string | null;
  status: "pending" | "approved" | "rejected";
  admin_comment: string | null;
  reviewed_by: number | null;
  submitted_at: string;
  reviewed_at: string | null;
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
const accessTokenKey = "openforge_access_token";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getAccessToken(): string | null {
  return typeof window === "undefined"
    ? null
    : window.sessionStorage.getItem(accessTokenKey);
}

export function setAccessToken(token: string): void {
  window.sessionStorage.setItem(accessTokenKey, token);
}

export function clearAccessToken(): void {
  window.sessionStorage.removeItem(accessTokenKey);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error("The API URL is not configured.");
  }

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (response.ok) {
      throw new Error("The API returned an invalid response.");
    }
  }

  if (!response.ok) {
    const detail =
      typeof payload === "object" &&
      payload !== null &&
      "detail" in payload &&
      typeof payload.detail === "string"
        ? payload.detail
        : `The request failed (${response.status}).`;
    throw new ApiError(detail, response.status);
  }

  return payload as T;
}

export function registerDeveloper(input: {
  full_name: string;
  email: string;
  password: string;
}): Promise<User> {
  return request<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: {
  email: string;
  password: string;
}): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getCurrentUser(token: string): Promise<User> {
  return request<User>("/auth/me", {}, token);
}

export function getCategories(): Promise<Category[]> {
  return request<Category[]>("/api/categories");
}

export function getMySubmissions(token: string): Promise<Submission[]> {
  return request<Submission[]>("/api/submissions/my", {}, token);
}

export function createSubmission(
  token: string,
  input: SubmissionInput
): Promise<Submission> {
  return request<Submission>(
    "/api/submissions",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    token
  );
}

export function getPendingSubmissions(token: string): Promise<Submission[]> {
  return request<Submission[]>("/api/admin/submissions/pending", {}, token);
}

export function approveSubmission(
  token: string,
  submissionId: number
): Promise<Submission> {
  return request<Submission>(
    `/api/admin/submissions/${submissionId}/approve`,
    { method: "POST" },
    token
  );
}

export function rejectSubmission(
  token: string,
  submissionId: number,
  admin_comment: string
): Promise<Submission> {
  return request<Submission>(
    `/api/admin/submissions/${submissionId}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ admin_comment }),
    },
    token
  );
}
