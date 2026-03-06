export enum WorkspaceRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export enum ProjectRole {
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  TEAM_MEMBER = 'TEAM_MEMBER',
  VIEWER = 'VIEWER',
  GUEST = 'GUEST',
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

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl: string | null;
  isGlobalAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  user?: User;
  workspace?: Workspace;
  createdAt: string;
}

export interface Space {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  workspace?: Workspace;
  projects?: Project[];
  _count?: {
    projects: number;
  };
}

export interface Project {
  id: string;
  workspaceId: string;
  spaceId: string | null;
  name: string;
  key: string;
  description: string | null;
  autoArchive?: boolean;
  autoArchiveDelay?: number;
  createdAt: string;
  updatedAt: string;
  workspace?: Workspace;
  space?: Space;
  statuses?: ProjectStatus[];
  _count?: {
    tasks: number;
    members: number;
  };
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  user?: User;
  project?: Project;
  createdAt: string;
}

export interface ProjectStatus {
  id: string;
  projectId: string;
  name: string;
  category: StatusCategory;
  color: string;
  position: number;
  isDefault?: boolean;
  project?: Project;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  statusId: string;
  assigneeId: string | null;
  reporterId: string;
  parentId: string | null;
  taskNumber: number;
  title: string;
  description: string | null;
  priority: Priority;
  position: number;
  startDate: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  closedAt: string | null;
  closedById: string | null;
  recurrenceRule: string | null;
  recurrenceInterval: number;
  recurrenceDays: string[];
  nextRecurrence: string | null;
  recurrenceEndDate: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  status?: ProjectStatus;
  assignee?: User;
  reporter?: User;
  closedBy?: User;
  parent?: Task;
  subtasks?: Task[];
  assignees?: TaskAssignee[];
  labels?: TaskLabel[];
  comments?: Comment[];
  attachments?: Attachment[];
  timeEntries?: TimeEntry[];
  totalLoggedHours?: number;
  _count?: {
    subtasks: number;
    comments: number;
    attachments: number;
    timeEntries: number;
  };
}

export interface TaskAssignee {
  id: string;
  taskId: string;
  userId: string;
  user?: User;
  createdAt: string;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  type: DependencyType;
  task?: Task;
  dependsOnTask?: Task;
  createdAt: string;
}

export interface Label {
  id: string;
  projectId: string;
  name: string;
  color: string;
  project?: Project;
  createdAt: string;
  updatedAt: string;
}

export interface TaskLabel {
  id: string;
  taskId: string;
  labelId: string;
  task?: Task;
  label?: Label;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  author?: User;
  task?: Task;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  taskId: string;
  uploadedById: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  uploadedBy?: User;
  task?: Task;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  hours: number;
  description: string | null;
  date: string;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceId: string | null;
  resourceType: string | null;
  isRead: boolean;
  user?: User;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  workspaceId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  user?: User;
  workspace?: Workspace;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  taskId: string;
  title: string;
  isChecked: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveTimer {
  id: string;
  taskId: string;
  userId: string;
  startedAt: string;
  task?: {
    id: string;
    title: string;
    taskNumber: number;
    projectId: string;
  };
}

export interface SubtaskTemplate {
  title: string;
  priority?: string;
}

export interface TaskTemplate {
  id: string;
  projectId: string;
  createdById: string;
  name: string;
  description: string | null;
  priority: Priority;
  subtaskTemplates: SubtaskTemplate[] | null;
  createdBy?: User;
  createdAt: string;
  updatedAt: string;
}
