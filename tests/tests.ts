import {assertEquals} from "jsr:@std/assert";
import {CancelableContext, Context, DeadlineContext, withCancel, withTimeout,} from "../src/mod.ts";

Deno.test("CancelableContext", () => {
  const todoCtx = Context.todo();
  const ctx = new CancelableContext(todoCtx);

  assertEquals(ctx.getCause(), null);
  assertEquals(ctx.isCancelled(), false);
  ctx.cancel();
  assertEquals(ctx.isCancelled(), true);
  assertEquals(ctx.getCause(), "context canceled");
});

Deno.test("DeadlineContext", async (t) => {
  await t.step("with cancelable parent", async () => {
    const parentCtx = new CancelableContext(Context.todo());
    const ctx = new DeadlineContext(parentCtx, 10000);

    assertEquals(ctx.getCause(), null);
    assertEquals(ctx.isCancelled(), false);
    assertEquals(ctx.getParent(), parentCtx);
    parentCtx.cancel("parent canceled");
    assertEquals(ctx.isCancelled(), true);
    assertEquals(ctx.getCause(), "parent canceled");
    assertEquals(await ctx.done, "parent canceled");
  });

  await t.step("with timeout", async () => {
    const ctx = new DeadlineContext(Context.todo(), 1000);

    assertEquals(ctx.getCause(), null);
    assertEquals(ctx.isCancelled(), false);

    await new Promise((resolve) => setTimeout(resolve, 1500));
    assertEquals(ctx.isCancelled(), false);
    assertEquals(ctx.getCause(), "context deadline exceeded");
    assertEquals(await ctx.done, "context deadline exceeded");
  });
});

Deno.test("with Functions", async (t) => {
  await t.step("withCancel", () => {
    const [ctx, cancel] = withCancel(Context.todo());

    assertEquals(ctx.getCause(), null);
    assertEquals(ctx.isCancelled(), false);
    ctx.cancel();
    assertEquals(ctx.isCancelled(), true);
    assertEquals(ctx.getCause(), "context canceled");
  });

  await t.step("withTimeout", async () => {
    const [ctx, cancel] = withTimeout(Context.todo(), 1000);

    assertEquals(ctx.getCause(), null);
    assertEquals(ctx.isCancelled(), false);

    await new Promise((resolve) => setTimeout(resolve, 1500));
    assertEquals(ctx.isCancelled(), false);
    assertEquals(ctx.getCause(), "context deadline exceeded");
    assertEquals(await ctx.done, "context deadline exceeded");
  });
});

Deno.test("with http request", async () => {
  const [ctx, cancel] = withTimeout(Context.todo(), 1);
  const signal = ctx.getController().signal;

  try {
    await fetch("https://jsonplaceholder.typicode.com/posts/1", { signal });
  } catch (e) {
    assertEquals(e, "context deadline exceeded");
  }
});
