declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export interface AuthUser {
  id: string;
  email: string;
}

export enum WorkspaceRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export enum ProjectRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export enum Priority {
  URGENT = 'URGENT',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  NONE = 'NONE',
}

export enum StatusCategory {
  NOT_STARTED = 'NOT_STARTED',
  ACTIVE = 'ACTIVE',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum DependencyType {
  FINISH_TO_START = 'FINISH_TO_START',
  START_TO_START = 'START_TO_START',
  FINISH_TO_FINISH = 'FINISH_TO_FINISH',
  START_TO_FINISH = 'START_TO_FINISH',
}

export enum NotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  TASK_UPDATED = 'TASK_UPDATED',
  MENTIONED = 'MENTIONED',
  STATUS_CHANGED = 'STATUS_CHANGED',
}
