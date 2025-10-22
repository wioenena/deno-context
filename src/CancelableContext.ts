import { Context } from "./Context.ts";

/**
 * Type for a callback function that is invoked when a CancelableContext is canceled.
 * @param cause - The reason for cancellation.
 */
export type CancelCallback = (cause: string) => void;

/**
 * A context that can be explicitly canceled.
 * Extends the base Context class.
 */
export class CancelableContext extends Context {
  /** Indicates if this context has been canceled. */
  private canceled!: boolean;
  /** The cause/reason for cancellation. */
  private cause!: string | null;
  /** Array of registered cancellation callbacks. */
  private cancelCallback!: CancelCallback[];
  /** Internal AbortController for signaling cancellation. */
  private readonly controller!: AbortController;
  /** Optional child context that inherits cancellation. */
  private readonly children!: CancelableContext | null;

  /**
   * Creates a new CancelableContext with an optional parent.
   * @param parent - The parent context.
   */
  public constructor(parent: Context) {
    super(parent);

    Object.defineProperty(this, "controller", {
      configurable: false,
      enumerable: false,
      writable: false,
      value: new AbortController(),
    });

    Object.defineProperty(this, "cancelCallback", {
      configurable: false,
      enumerable: false,
      writable: false,
      value: [],
    });

    Object.defineProperty(this, "cause", {
      configurable: false,
      enumerable: false,
      writable: true,
      value: null,
    });

    Object.defineProperty(this, "canceled", {
      configurable: false,
      enumerable: false,
      writable: true,
      value: false,
    });

    Object.defineProperty(this, "children", {
      configurable: false,
      enumerable: false,
      writable: true,
      value: null,
    });

    // If the parent is also a CancelableContext, we want to link this context as its child.
    // This allows cancellation to propagate from the parent to this child context automatically.
    if (parent instanceof CancelableContext) {
      // If the parent is already canceled, immediately cancel this child context
      // using the same cancellation cause.
      if (parent.isCancelled()) {
        this.cancel(parent.getCause()!);
        return;
      }

      // Otherwise, register this context as the child of the parent.
      // This ensures that when the parent is canceled in the future,
      // cancellation will automatically propagate to this child context.
      Object.defineProperty(parent, "children", {
        value: this,
      });
    }
  }

  /**
   * Cancels this context and invokes all registered cancellation callbacks.
   * Also propagates cancellation to child contexts if present.
   * @param cause - Optional reason for cancellation. Defaults to "context canceled".
   */
  public cancel(cause: string = "context canceled"): void {
    if (!this.canceled) {
      this.canceled = true;
      this.cause = cause;
      this.cancelCallback.forEach((callback) => callback(this.cause!));
      this.controller.abort(cause);

      if (this.children !== null) {
        this.children.cancel(cause);
      }
    }
  }

  /**
   * Registers a callback to be invoked when the context is canceled.
   * If already canceled, the callback is invoked immediately.
   * @param callback - Function to call on cancellation.
   */
  public onCancel(callback: CancelCallback): void {
    if (this.canceled) {
      callback(this.cause!);
    } else {
      this.cancelCallback.push(callback);
    }
  }

  /**
   * Checks if this context has been canceled.
   * @returns `true` if canceled, otherwise `false`.
   */
  public isCancelled(): boolean {
    return this.canceled;
  }

  /**
   * Returns the cancellation cause/reason, or null if not canceled.
   * @returns The cancellation cause or `null`.
   */
  public getCause(): string | null {
    return this.cause;
  }

  /**
   * Overrides the base getParent method to ensure non-null parent.
   * @returns The parent Context.
   */
  public override getParent(): Context {
    return this.parent!;
  }

  /**
   * Returns the internal AbortController.
   * Useful for integrating with APIs that support AbortSignal.
   * @returns The internal AbortController.
   */
  public getController(): AbortController {
    return this.controller;
  }

  /**
   * Sets the cancellation cause without triggering callbacks.
   * @param cause - The reason for cancellation.
   */
  protected setCause(cause: string): void {
    this.cause = cause;
  }
}

/**
 * Type for a function that cancels a context.
 * @param cause - Optional reason for cancellation.
 */
export type CancelFunc = (cause?: string) => void;

/**
 * Creates a new CancelableContext from a parent context and returns
 * a tuple of the context and a cancel function.
 * @param parent - The parent context.
 * @returns A tuple [CancelableContext, CancelFunc]
 */
export const withCancel = (
  parent: Context,
): [CancelableContext, CancelFunc] => {
  const ctx = new CancelableContext(parent);
  return [ctx, (cause?: string) => ctx.cancel(cause)];
};
