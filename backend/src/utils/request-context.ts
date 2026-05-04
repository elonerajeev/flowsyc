import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
  userId: string;
  email: string;
  role: "admin" | "manager" | "employee" | "client";
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getCurrentUser(): RequestContext | undefined {
  return requestContext.getStore();
}

export function setCurrentUser(user: RequestContext): void {
  requestContext.enterWith(user);
}

export function clearCurrentUser(): void {
  // AsyncLocalStorage doesn't need explicit clearing — context is scoped to the async chain
}