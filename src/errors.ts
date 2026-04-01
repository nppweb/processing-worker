export class WorkerError extends Error {
  constructor(
    message: string,
    public readonly kind: "poison" | "transient",
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class PoisonMessageError extends WorkerError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, "poison", options);
  }
}

export class TransientMessageError extends WorkerError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, "transient", options);
  }
}

export function isPoisonMessageError(error: unknown): error is PoisonMessageError {
  return error instanceof WorkerError && error.kind === "poison";
}

export function isTransientMessageError(error: unknown): error is TransientMessageError {
  return error instanceof WorkerError && error.kind === "transient";
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
