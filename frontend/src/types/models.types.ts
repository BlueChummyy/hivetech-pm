export enum WorkspaceRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

export enum ProjectRole {
  LEAD = 'LEAD',
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
  BACKLOG = 'BACKLOG',
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum DependencyType {
  BLOCKS = 'BLOCKS',
  IS_BLOCKED_BY = 'IS_BLOCKED_BY',
  RELATES_TO = 'RELATES_TO',
  DUPLICATES = 'DUPLICATES',
}

export enum NotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_COMMENTED = 'TASK_COMMENTED',
  MENTION = 'MENTION',
  PROJECT_INVITE = 'PROJECT_INVITE',
  WORKSPACE_INVITE = 'WORKSPACE_INVITE',
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
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
  updatedAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  key: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  workspace?: Workspace;
  statuses?: ProjectStatus[];
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  user?: User;
  project?: Project;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStatus {
  id: string;
  projectId: string;
  name: string;
  category: StatusCategory;
  color: string;
  position: number;
  project?: Project;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  statusId: string;
  assigneeId: string | null;
  creatorId: string;
  parentId: string | null;
  title: string;
  description: string | null;
  priority: Priority;
  identifier: string;
  sortOrder: number;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  status?: ProjectStatus;
  assignee?: User;
  creator?: User;
  parent?: Task;
  subtasks?: Task[];
  labels?: TaskLabel[];
  comments?: Comment[];
  attachments?: Attachment[];
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
  userId: string;
  content: string;
  user?: User;
  task?: Task;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  taskId: string;
  uploaderId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploader?: User;
  task?: Task;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceId: string | null;
  resourceType: string | null;
  read: boolean;
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
