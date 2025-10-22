import { CancelableContext, CancelFunc } from "./CancelableContext.ts";
import { Context } from "./Context.ts";

/**
 * Type for the resolve function of the deadline promise.
 * @param cause - The reason for cancellation or deadline expiration.
 */
type DoneResolve = (cause: string) => void;
/** Type representing a promise that resolves when the context is done. */
type DeadLineDone = Promise<string>;

/**
 * A context that supports a deadline (timeout) after which it is automatically canceled.
 * Extends CancelableContext.
 */
export class DeadlineContext extends CancelableContext {
  /** ID of the timeout timer. */
  private timeoutId!: ReturnType<typeof setTimeout> | null;
  /** Internal resolve function for the done promise. */
  private readonly doneResolve!: DoneResolve;
  /** Promise that resolves when the context is canceled or deadline is exceeded. */
  private readonly _done!: DeadLineDone;

  /**
   * Creates a new DeadlineContext with a parent context and a timeout in milliseconds.
   * @param parent - The parent context.
   * @param timeoutMs - Timeout in milliseconds after which the context is canceled.
   */
  public constructor(parent: Context, timeoutMs: number) {
    super(parent);

    this.initializeTimer(timeoutMs);

    // Initialize the done promise
    Object.defineProperty(this, "_done", {
      configurable: false,
      enumerable: false,
      writable: false,
      value: new Promise<string>((resolve) => {
        Object.defineProperty(this, "doneResolve", {
          configurable: false,
          enumerable: false,
          writable: false,
          value: resolve,
        });
      }),
    });

    // If parent is already canceled, cancel this context immediately
    if (parent instanceof CancelableContext) {
      if (parent.isCancelled()) {
        this.cancel(parent.getCause()!);
        return;
      }

      // If parent is a DeadlineContext, propagate cancellation when parent completes
      if (parent instanceof DeadlineContext) {
        (async () => {
          await parent.done;
          this.cancel(parent.getCause()!);
        })();
      }
    }

    // Set this context as a child of the parent
    Object.defineProperty(parent, "children", {
      value: this,
    });
  }

  /**
   * Returns a promise that resolves when the context is canceled or deadline is exceeded.
   * @returns A promise that resolves with the cause string.
   */
  public get done(): DeadLineDone {
    return this._done;
  }

  /**
   * Cancels the context and resolves the done promise.
   * Clears the timeout timer.
   * @param cause - Optional reason for cancellation.
   */
  public override cancel(cause: string = "context canceled") {
    this.clearTimeout();
    super.cancel(cause);
    this.doneResolve(cause);
  }

  /**
   * Starts the timeout timer for this deadline context.
   * @param timeoutMs - Timeout in milliseconds.
   */
  private initializeTimer(timeoutMs: number) {
    if (this.timeoutId == null) {
      Object.defineProperty(this, "timeoutId", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: setTimeout(() => {
          this.finish();
        }, timeoutMs),
      });
    }
  }

  /**
   * Called when the deadline expires.
   * Aborts the context and resolves the done promise.
   */
  private finish() {
    const controller = this.getController();
    this.setCause("context deadline exceeded");
    controller.abort(this.getCause()!);
    this.doneResolve(this.getCause()!);
  }

  /** Clears the timeout timer if it exists. */
  private clearTimeout() {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

/**
 * Creates a DeadlineContext with a specified timeout and returns a tuple
 * of the context and a cancel function.
 * @param parent - The parent context.
 * @param timeoutMs - Timeout in milliseconds.
 * @returns A tuple [DeadlineContext, CancelFunc]
 */
export const withTimeout = (
  parent: Context,
  timeoutMs: number,
): [DeadlineContext, CancelFunc] => {
  const ctx = new DeadlineContext(parent, timeoutMs);
  return [ctx, (cause?: string) => ctx.cancel(cause)];
};
