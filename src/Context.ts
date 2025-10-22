/**
 * Base class representing a context for carrying deadlines, cancellation signals, and other request-scoped values.
 * This is inspired by Go's `context.Context` concept.
 */
export class Context {
  /**
   * The parent context, if any.
   * @private
   */
  protected parent!: Context | null;

  /**
   * Constructs a new Context instance.
   *
   * @param parent - The parent context, or `null` if this is a root context.
   */
  public constructor(parent: Context | null) {
    Object.defineProperty(this, "parent", {
      configurable: false,
      enumerable: false,
      writable: false,
      value: parent,
    });
  }

  /**
   * Returns a background context.
   * Background contexts are never canceled, have no values, and have no deadlines.
   * They are typically used as the top-level context in an application.
   *
   * @returns A new root Context with no parent.
   */
  public static background(): Context {
    return new Context(null);
  }

  /**
   * Returns a "TODO" context.
   * TODO contexts are placeholders for when it's unclear which context to use.
   * They behave the same as a background context.
   *
   * @returns A new root Context with no parent.
   */
  public static todo(): Context {
    return new Context(null);
  }

  /**
   * Returns the parent context of this context.
   *
   * @returns The parent `Context` if it exists, otherwise `null`.
   */
  public getParent(): Context | null {
    return this.parent;
  }
}
