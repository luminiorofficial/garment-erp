/** Shape of a process as returned by /api/processes (timestamps arrive as ISO strings). */
export interface Process {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
