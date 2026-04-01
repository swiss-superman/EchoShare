import {
  createCleanupEventAction,
  createCommentAction,
  createPostAction,
  joinCleanupEventAction,
} from "@/app/actions/community-actions";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getCommunityData } from "@/lib/data/queries";
import { toTitleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const data = await getCommunityData();

  return (
    <section className="space-y-6">
      <header className="shell-frame rounded-[1.8rem] px-6 py-6">
        <div className="section-kicker">Community layer</div>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em]">
          Organize people around a water body, not just a complaint
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
          Community posts provide general updates, cleanup calls, and localized
          coordination. Cleanup events convert concern into turnout with visible
          participation data.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="min-w-0 space-y-6">
          <form action={createPostAction} className="space-y-4 rounded-[1.8rem] border border-line bg-white/75 p-6">
            <div className="section-kicker">New post</div>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.04em]">
              Publish a community update
            </h2>
            <label className="block space-y-2 text-sm font-medium">
              <span>Title</span>
              <input className="w-full rounded-2xl border border-line bg-white px-4 py-3" name="title" required />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              <span>Type</span>
              <select className="w-full rounded-2xl border border-line bg-white px-4 py-3" defaultValue="GENERAL" name="type">
                <option value="GENERAL">General update</option>
                <option value="CLEANUP_CALL">Cleanup call</option>
                <option value="UPDATE">Progress update</option>
                <option value="ALERT">Alert</option>
              </select>
            </label>
            <label className="block space-y-2 text-sm font-medium">
              <span>Water body</span>
              <select className="w-full rounded-2xl border border-line bg-white px-4 py-3" defaultValue="" name="waterBodyId">
                <option value="">Not tied to a specific water body</option>
                {data.waterBodies.map((waterBody) => (
                  <option key={waterBody.id} value={waterBody.id}>
                    {waterBody.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2 text-sm font-medium">
              <span>Body</span>
              <textarea className="min-h-[180px] w-full rounded-2xl border border-line bg-white px-4 py-3" name="body" required />
            </label>
            <button className="w-full rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong" type="submit">
              Publish post
            </button>
          </form>

          <form action={createCleanupEventAction} className="space-y-4 rounded-[1.8rem] border border-line bg-white/75 p-6">
            <div className="section-kicker">Cleanup event</div>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.04em]">
              Create a turnout-ready cleanup
            </h2>
            <label className="block space-y-2 text-sm font-medium">
              <span>Title</span>
              <input className="w-full rounded-2xl border border-line bg-white px-4 py-3" name="title" required />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              <span>Water body</span>
              <select className="w-full rounded-2xl border border-line bg-white px-4 py-3" name="waterBodyId" required>
                {data.waterBodies.map((waterBody) => (
                  <option key={waterBody.id} value={waterBody.id}>
                    {waterBody.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                <span>Latitude</span>
                <input className="w-full rounded-2xl border border-line bg-white px-4 py-3" defaultValue="12.9716" name="latitude" required step="0.0001" type="number" />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Longitude</span>
                <input className="w-full rounded-2xl border border-line bg-white px-4 py-3" defaultValue="77.5946" name="longitude" required step="0.0001" type="number" />
              </label>
            </div>
            <label className="block space-y-2 text-sm font-medium">
              <span>Address or meeting point</span>
              <input className="w-full rounded-2xl border border-line bg-white px-4 py-3" name="address" />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              <span>Description</span>
              <textarea className="min-h-[160px] w-full rounded-2xl border border-line bg-white px-4 py-3" name="description" required />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              <span>Scheduled at</span>
              <input className="w-full rounded-2xl border border-line bg-white px-4 py-3" name="scheduledAt" required type="datetime-local" />
            </label>
            <button className="w-full rounded-full bg-[#0d2732] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black" type="submit">
              Launch cleanup event
            </button>
          </form>
        </div>

        <div className="min-w-0 space-y-5">
          {data.posts.length === 0 ? (
            <EmptyState
              detail="No community posts have been created yet. Publish an update or launch a cleanup call."
              title="Community feed is empty"
            />
          ) : (
            data.posts.map((post) => (
              <article key={post.id} className="rounded-[1.8rem] border border-line bg-white/75 p-6">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="brand">{toTitleCase(post.type)}</Badge>
                  {post.isDevelopmentSeed ? <Badge tone="muted">Development seed</Badge> : null}
                  {post.waterBody ? <Badge tone="default">{post.waterBody.name}</Badge> : null}
                </div>
                <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em]">
                  {post.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted">{post.body}</p>
                <p className="mt-4 text-sm text-muted">
                  Posted by {post.author.profile?.displayName ?? post.author.name ?? post.author.email}
                </p>

                {post.cleanupEvent ? (
                  <div className="mt-5 rounded-[1.5rem] border border-line bg-[#f8f3ea] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="section-kicker">Cleanup turnout</div>
                        <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em]">
                          {post.cleanupEvent.title}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-muted">
                          {post.cleanupEvent.description}
                        </p>
                        <p className="mt-2 text-sm text-muted">
                          {post.cleanupEvent.scheduledAt.toLocaleString("en-IN")} •{" "}
                          {post.cleanupEvent.participants.length} participant(s)
                        </p>
                      </div>
                      <form action={joinCleanupEventAction.bind(null, post.cleanupEvent.id)}>
                        <button className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong" type="submit">
                          Join cleanup
                        </button>
                      </form>
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 space-y-3">
                  <div className="section-kicker">Comments</div>
                  {post.comments.length > 0 ? (
                    post.comments.map((comment) => (
                      <div key={comment.id} className="rounded-[1.2rem] border border-line bg-white/70 p-4">
                        <p className="font-semibold">
                          {comment.author.profile?.displayName ?? comment.author.name ?? comment.author.email}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-muted">{comment.body}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted">No comments yet.</p>
                  )}
                </div>

                <form action={createCommentAction} className="mt-5 space-y-3">
                  <input name="postId" type="hidden" value={post.id} />
                  <textarea className="min-h-[100px] w-full rounded-2xl border border-line bg-white px-4 py-3" name="body" placeholder="Add a coordination note or reply" required />
                  <button className="rounded-full border border-line-strong px-4 py-2 text-sm font-semibold transition hover:bg-white" type="submit">
                    Add comment
                  </button>
                </form>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
