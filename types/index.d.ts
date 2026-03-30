import { Request, Response, NextFunction } from 'express';

// ─── Plans ────────────────────────────────────────────────────────────────

export type Plan = 'free' | 'pro';

// ─── Auth ─────────────────────────────────────────────────────────────────

export interface ApiKey {
  id:         number;
  user_id:    string;
  name:       string;
  key_prefix: string;
  plan:       Plan;
  expires_at: number | null;
  last_used:  number | null;
  revoked:    0 | 1;
  created_at: number;
}

export interface GeneratedKey {
  id:         number;
  key:        string;       // raw key — shown once only
  key_prefix: string;
  name:       string;
  plan:       Plan;
  expires_at: number | null;
  created_at: number;
}

export interface GenerateKeyBody {
  user_id:  string;
  name?:    string;
  plan?:    Plan;
  ttl_days?: number;
}

// ─── Projects ─────────────────────────────────────────────────────────────

export type ProjectStatus = 'active' | 'archived' | 'completed';
export type ProjectVisibility = 'private' | 'public';

export interface Project {
  id:           string;
  workspace_id: string;
  name:         string;
  description:  string | null;
  color:        string | null;
  status:       ProjectStatus;
  visibility:   ProjectVisibility;
  task_count:   number;
  created_at:   number;
  updated_at:   number;
}

export interface CreateProjectBody {
  workspace_id: string;
  name:         string;
  description?: string;
  color?:       string;
  visibility?:  ProjectVisibility;
}

export interface UpdateProjectBody {
  name?:        string;
  description?: string;
  color?:       string;
  status?:      ProjectStatus;
  visibility?:  ProjectVisibility;
}

export interface ListProjectsQuery {
  workspace_id: string;
  status?:      ProjectStatus;
  limit?:       string;
  page?:        string;
}

// ─── Tasks ────────────────────────────────────────────────────────────────

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus   = 'todo' | 'in_progress' | 'in_review' | 'done';

export interface Task {
  id:          string;
  project_id:  string;
  title:       string;
  description: string | null;
  status:      TaskStatus;
  priority:    TaskPriority;
  assignee_id: string | null;
  due_date:    string | null;
  tags:        string[];      // stored as JSON in DB
  created_at:  number;
  updated_at:  number;
}

export interface CreateTaskBody {
  project_id:   string;
  title:        string;
  description?: string;
  priority?:    TaskPriority;
  assignee_id?: string;
  due_date?:    string;
  tags?:        string[];
}

export interface UpdateTaskBody {
  title?:       string;
  description?: string;
  status?:      TaskStatus;
  priority?:    TaskPriority;
  assignee_id?: string;
  due_date?:    string;
  tags?:        string[];
}

export interface ListTasksQuery {
  status?:      TaskStatus;
  priority?:    TaskPriority;
  assignee_id?: string;
  limit?:       string;
  page?:        string;
}

// ─── Request extensions ───────────────────────────────────────────────────

export interface AuthPayload {
  key_id:  number;
  user_id: string;
  plan:    Plan;
}

export interface AuthRequest extends Request {
  auth: AuthPayload;
}

// ─── API responses ────────────────────────────────────────────────────────

export interface ApiError {
  code:     string;
  message:  string;
  field?:   string;
  docs?:    string;
}

export interface ApiResponse<T> {
  ok:   true;
  data: T;
}

export interface PaginatedResponse<T> {
  ok:   true;
  data: T[];
  meta: {
    total: number;
    page:  number;
    limit: number;
  };
}

// ─── Controller handler type ──────────────────────────────────────────────

export type Handler = (req: Request, res: Response, next: NextFunction) => Promise<void>;