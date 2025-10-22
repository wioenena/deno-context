# Context Library Documentation

This document provides an overview of the custom context library implemented in TypeScript, inspired by Go's `context.Context`. The library supports cancelable contexts, deadlines (timeouts), and integration with async operations.

---

## Table of Contents

- [Context](#context)
- [CancelableContext](#cancelablecontext)
- [DeadlineContext](#deadlinecontext)
- [Utility Functions](#utility-functions)
  - [withCancel](#withcancel)
  - [withTimeout](#withtimeout)
- [Tests](#tests)
- [Usage Example](#usage-example)

---

## Context

`Context` is the base class for managing request-scoped values, cancellation signals, and deadlines.

### Constructor
```ts
constructor(parent: Context | null)
```
- `parent`: The parent context, or `null` for a root context.

### Static Methods
- `Context.background()`: Returns a root context with no parent. Never canceled.
- `Context.todo()`: Returns a placeholder context, same as `background()`.

### Instance Methods
- `getParent(): Context | null`: Returns the parent context, or `null` if none.

---

## CancelableContext

`CancelableContext` extends `Context` and allows explicit cancellation.

### Constructor
```ts
constructor(parent: Context)
```
- `parent`: The parent context.

### Instance Methods
- `cancel(cause?: string): void`: Cancels the context. Optional `cause`, defaults to `'context canceled'`.
- `onCancel(callback: CancelCallback): void`: Registers a callback to run on cancellation.
- `isCancelled(): boolean`: Returns whether the context is canceled.
- `getCause(): string | null`: Returns the cause of cancellation.
- `getController(): AbortController`: Returns the internal `AbortController`.

### Properties
- `canceled`: boolean indicating cancellation.
- `cause`: string describing the cancellation reason.
- `children`: Optional child context.
- `controller`: Internal `AbortController` instance.

### Types
- `CancelCallback = (cause: string) => void`
- `CancelFunc = (cause?: string) => void`

### Utility Function
```ts
withCancel(parent: Context): [CancelableContext, CancelFunc]
```
Creates a `CancelableContext` from a parent and returns it with a cancel function.

---

## DeadlineContext

`DeadlineContext` extends `CancelableContext` and adds support for automatic cancellation after a timeout.

### Constructor
```ts
constructor(parent: Context, timeoutMs: number)
```
- `parent`: The parent context.
- `timeoutMs`: Timeout in milliseconds.

### Instance Methods
- `done: Promise<string>`: Resolves when context is canceled or deadline is exceeded.
- `cancel(cause?: string)`: Cancels the context and resolves the `done` promise.

### Internal Methods
- `initializeTimer(timeoutMs: number)`: Starts the timeout timer.
- `finish()`: Called when deadline expires. Cancels context.
- `clearTimeout()`: Clears the timeout timer.

### Utility Function
```ts
withTimeout(parent: Context, timeoutMs: number): [DeadlineContext, CancelFunc]
```
Creates a `DeadlineContext` with a specified timeout.

---

## Tests

The library includes comprehensive tests using Deno's testing framework.

### CancelableContext Tests
- Create a cancelable context.
- Check initial state.
- Call `cancel()` and verify state changes.

### DeadlineContext Tests
- With cancelable parent: verify cancellation propagates.
- With timeout: verify automatic cancellation after timeout.

### Utility Function Tests
- `withCancel`: ensures cancelable context works correctly.
- `withTimeout`: ensures deadline triggers cancellation.

### HTTP Integration Test
- Demonstrates using `DeadlineContext`'s `AbortController` with `fetch`.

---

## Usage Example

```ts
import { Context, withCancel, withTimeout } from './mod.ts';

// Basic cancelable context
const [ctx, cancel] = withCancel(Context.todo());
ctx.onCancel((cause) => console.log('Canceled because:', cause));
cancel();

// Deadline context
const [dctx, dcancel] = withTimeout(Context.todo(), 2000);
try {
  await fetch('https://example.com', { signal: dctx.getController().signal });
} catch (err) {
  console.log('Fetch aborted:', err);
}
```

---

This documentation describes the design, usage, and testing of the TypeScript context library, which closely mimics Go's context mechanism for async workflows.

