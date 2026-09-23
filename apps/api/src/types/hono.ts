export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AppVariables {
  user: AuthenticatedUser;
  permissionCodes: Set<string>;
}

export interface AppEnv {
  Variables: AppVariables;
}
