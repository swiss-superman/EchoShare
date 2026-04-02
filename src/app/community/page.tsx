import {
  createCleanupEventAction,
  createCommentAction,
  createPostAction,
  joinCleanupEventAction,
} from "@/app/actions/community-actions";
import { Badge } from "@/components/ui/badge";
import { getCommunityData, getDirectoryData } from "@/lib/data/queries";
import { toTitleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

type CommunityData = Awaited<ReturnType<typeof getCommunityData>>;
type CommunityPost = CommunityData["posts"][number];
type DirectoryEntry = Awaited<ReturnType<typeof getDirectoryData>>[number];

function formatDateTime(value: Date) {
  return value.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getChannelLabel(post: CommunityPost) {
  return (
    post.waterBody?.name ??
    post.location?.label ??
    post.location?.locality ??
    "General coordination"
  );
}

function buildWaterBodyBoards(posts: CommunityPost[]) {
  const grouped = new Map<
    string,
    {
      label: string;
      postCount: number;
      cleanupCount: number;
      alertCount: number;
      latestAt: Date;
    }
  >();

  for (const post of posts) {
    const label = getChannelLabel(post);
    const current = grouped.get(label) ?? {
      label,
      postCount: 0,
      cleanupCount: 0,
      alertCount: 0,
      latestAt: post.createdAt,
    };

    current.postCount += 1;
    if (post.cleanupEvent) {
      current.cleanupCount += 1;
    }
    if (post.type === "ALERT" || post.type === "CLEANUP_CALL") {
      current.alertCount += 1;
    }
    if (post.createdAt > current.latestAt) {
      current.latestAt = post.createdAt;
    }

    grouped.set(label, current);
  }

  return Array.from(grouped.values())
    .map((entry) => ({
      ...entry,
      score: entry.cleanupCount * 4 + entry.alertCount * 3 + entry.postCount,
    }))
    .sort((left, right) => right.score - left.score || right.latestAt.getTime() - left.latestAt.getTime())
    .slice(0, 6);
}

function buildResponseChannels(responders: DirectoryEntry[]) {
  const ngoResponders = responders.filter((entry) =>
    ["NGO", "COMMUNITY_GROUP", "VOLUNTEER_NETWORK"].includes(entry.type),
  );
  const officialResponders = responders.filter((entry) =>
    ["GOVERNMENT", "ACADEMIC", "CSR"].includes(entry.type),
  );

  return {
    ngoResponders: ngoResponders.slice(0, 4),
    officialResponders: officialResponders.slice(0, 4),
  };
}

function ResponderList({
  title,
  description,
  responders,
}: {
  title: string;
  description: string;
  responders: DirectoryEntry[];
}) {
  return (
    <section className="rounded-[1.6rem] border border-line bg-white/70 p-5">
      <div className="section-kicker">{title}</div>
      <p className="mt-3 text-sm leading-7 text-muted">{description}</p>
      <div className="mt-4 space-y-3">
        {responders.map((responder) => (
          <article
            key={responder.id}
            className="rounded-[1.2rem] border border-line bg-white/75 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold">{responder.name}</p>
                <p className="mt-1 text-sm text-muted">{responder.areaServed}</p>
              </div>
              <Badge tone={responder.type === "GOVERNMENT" ? "muted" : "brand"}>
                {toTitleCase(responder.type)}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {responder.issueFocus.slice(0, 2).map((item) => (
                <Badge key={item} tone="default">
                  {item}
                </Badge>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {responder.website ? (
                <a
                  className="text-sm font-semibold text-brand"
                  href={responder.website}
                >
                  Official site
                </a>
              ) : null}
              {responder.complaintUrl ? (
                <a
                  className="text-sm font-semibold text-brand"
                  href={responder.complaintUrl}
                >
                  Escalation route
                </a>
              ) : null}
              {responder.volunteerUrl ? (
                <a
                  className="text-sm font-semibold text-brand"
                  href={responder.volunteerUrl}
                >
                  Volunteer
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CommunityFeedCard({
  post,
}: {
  post: CommunityPost;
}) {
  return (
    <article className="rounded-[1.8rem] border border-line bg-white/75 p-6">
      <div className="flex flex-wrap gap-2">
        <Badge tone="brand">{toTitleCase(post.type)}</Badge>
        {post.waterBody ? <Badge tone="default">{post.waterBody.name}</Badge> : null}
        {post.isDevelopmentSeed ? <Badge tone="muted">Development seed</Badge> : null}
      </div>

      <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em]">
        {post.title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted">{post.body}</p>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted">
        <span>
          Posted by{" "}
          {post.author.profile?.displayName ?? post.author.name ?? post.author.email}
        </span>
        <span>{formatDateTime(post.createdAt)}</span>
        {post.location ? (
          <span>
            {post.location.locality ?? post.location.label ?? "Location noted"}
            {post.location.state ? `, ${post.location.state}` : ""}
          </span>
        ) : null}
      </div>

      {post.cleanupEvent ? (
        <div className="mt-5 rounded-[1.5rem] border border-line bg-[#f8f3ea] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="section-kicker">Cleanup operation</div>
              <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em]">
                {post.cleanupEvent.title}
              </p>
              <p className="mt-2 text-sm leading-7 text-muted">
                {post.cleanupEvent.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted">
                <span>{formatDateTime(post.cleanupEvent.scheduledAt)}</span>
                <span>
                  {post.cleanupEvent.participants.length} participant
                  {post.cleanupEvent.participants.length === 1 ? "" : "s"}
                </span>
                <span>{toTitleCase(post.cleanupEvent.status)}</span>
              </div>
            </div>
            <form action={joinCleanupEventAction.bind(null, post.cleanupEvent.id)}>
              <button
                className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong"
                type="submit"
              >
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
            <div
              key={comment.id}
              className="rounded-[1.2rem] border border-line bg-white/70 p-4"
            >
              <p className="font-semibold">
                {comment.author.profile?.displayName ??
                  comment.author.name ??
                  comment.author.email}
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
        <textarea
          className="min-h-[100px] w-full rounded-2xl border border-line bg-white px-4 py-3"
          name="body"
          placeholder="Add a coordination note or reply"
          required
        />
        <button
          className="rounded-full border border-line-strong px-4 py-2 text-sm font-semibold transition hover:bg-white"
          type="submit"
        >
          Add comment
        </button>
      </form>
    </article>
  );
}

export default async function CommunityPage() {
  const [data, responders] = await Promise.all([
    getCommunityData(),
    getDirectoryData(),
  ]);

  const operationsPosts = data.posts.filter((post) => Boolean(post.cleanupEvent));
  const actionPosts = data.posts.filter(
    (post) => !post.cleanupEvent && (post.type === "ALERT" || post.type === "CLEANUP_CALL"),
  );
  const updatePosts = data.posts.filter(
    (post) => !post.cleanupEvent && (post.type === "GENERAL" || post.type === "UPDATE"),
  );
  const waterBodyBoards = buildWaterBodyBoards(data.posts);
  const { ngoResponders, officialResponders } = buildResponseChannels(responders);
  const activeWaterBodyCount = new Set(
    data.posts
      .map((post) => post.waterBody?.name)
      .filter((value): value is string => Boolean(value)),
  ).size;
  const hasPosts = data.posts.length > 0;

  return (
    <section className="w-full min-w-0 space-y-6 overflow-x-clip">
      <header className="shell-frame rounded-[1.8rem] px-6 py-6">
        <div className="section-kicker">Community layer</div>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em]">
          Turn a pollution report into a local response operation
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
          EchoShare community is most useful when it stays localized: each post,
          cleanup, and response note should help one water body move from
          evidence to visible action.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <div className="rounded-[1.3rem] border border-line bg-white/68 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted">
              Active operations
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">
              {operationsPosts.length}
            </div>
            <div className="mt-2 text-sm text-muted">
              Cleanup events with turnout and coordination
            </div>
          </div>
          <div className="rounded-[1.3rem] border border-line bg-white/68 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted">
              Action calls
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">
              {actionPosts.length}
            </div>
            <div className="mt-2 text-sm text-muted">
              Alerts and cleanup calls waiting for attention
            </div>
          </div>
          <div className="rounded-[1.3rem] border border-line bg-white/68 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted">
              Water-body channels
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">
              {activeWaterBodyCount}
            </div>
            <div className="mt-2 text-sm text-muted">
              Localized boards with actual community activity
            </div>
          </div>
          <div className="rounded-[1.3rem] border border-line bg-white/68 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted">
              Real responders
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">
              {responders.length}
            </div>
            <div className="mt-2 text-sm text-muted">
              NGOs and official channels ready for routing
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          {hasPosts ? null : (
            <section className="shell-frame rounded-[1.8rem] px-6 py-6">
              <div className="section-kicker">Community board</div>
              <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                <div className="min-w-0">
                  <h2 className="font-display text-4xl font-semibold tracking-[-0.04em]">
                    No local operations have started yet
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
                    Use this space to publish the first action update, launch a
                    cleanup call, or connect a water-body issue to real responder
                    channels. The community layer works best when it turns one
                    verified hotspot into one visible response operation.
                  </p>
                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <article className="rounded-[1.3rem] border border-line bg-white/72 p-4">
                      <div className="section-kicker">Step 1</div>
                      <h3 className="mt-3 text-xl font-semibold">
                        Publish a local action note
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-muted">
                        Add a field update tied to a real lake, river, canal, or
                        wetland so others know where follow-through is needed.
                      </p>
                    </article>
                    <article className="rounded-[1.3rem] border border-line bg-white/72 p-4">
                      <div className="section-kicker">Step 2</div>
                      <h3 className="mt-3 text-xl font-semibold">
                        Launch a turnout-ready cleanup
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-muted">
                        Set the meeting point, timing, and organizer details so
                        the first response is actionable instead of just social.
                      </p>
                    </article>
                    <article className="rounded-[1.3rem] border border-line bg-white/72 p-4">
                      <div className="section-kicker">Step 3</div>
                      <h3 className="mt-3 text-xl font-semibold">
                        Route the issue to real responders
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-muted">
                        Use the NGO and government channels in the side panel for
                        escalation, volunteer turnout, and on-ground support.
                      </p>
                    </article>
                  </div>
                </div>
                <div className="rounded-[1.55rem] border border-dashed border-line-strong bg-white/65 p-5">
                  <div className="section-kicker">Ready state</div>
                  <h3 className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em]">
                    Community board is ready
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    EchoShare does not need synthetic posts to feel alive. As soon
                    as the first real local update or cleanup call is created, it
                    will appear in the operations stream here.
                  </p>
                </div>
              </div>
            </section>
          )}

          {operationsPosts.length > 0 ? (
            <section className="space-y-4">
              <div className="flex flex-col gap-2">
                <div className="section-kicker">Active cleanup operations</div>
                <h2 className="font-display text-3xl font-semibold tracking-[-0.04em]">
                  Turnout-ready events tied to real water bodies
                </h2>
              </div>
              <div className="space-y-5">
                {operationsPosts.map((post) => (
                  <CommunityFeedCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          ) : null}

          {actionPosts.length > 0 ? (
            <section className="space-y-4">
              <div className="flex flex-col gap-2">
                <div className="section-kicker">Alerts and action calls</div>
                <h2 className="font-display text-3xl font-semibold tracking-[-0.04em]">
                  Posts that need response, turnout, or escalation
                </h2>
              </div>
              <div className="space-y-5">
                {actionPosts.map((post) => (
                  <CommunityFeedCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          ) : null}

          {updatePosts.length > 0 ? (
            <section className="space-y-4">
              <div className="flex flex-col gap-2">
                <div className="section-kicker">Community updates</div>
                <h2 className="font-display text-3xl font-semibold tracking-[-0.04em]">
                  Local notes, progress updates, and field context
                </h2>
              </div>
              <div className="space-y-5">
                {updatePosts.map((post) => (
                  <CommunityFeedCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="grid gap-6 2xl:grid-cols-2">
            <form
              action={createPostAction}
              className="space-y-4 rounded-[1.8rem] border border-line bg-white/75 p-6"
            >
              <div className="section-kicker">New post</div>
              <h2 className="font-display text-3xl font-semibold tracking-[-0.04em]">
                Publish a local action update
              </h2>
              <p className="text-sm leading-7 text-muted">
                Best used for a water-body update, a volunteer call, or a
                coordination alert tied to a real cleanup need.
              </p>
              <label className="block space-y-2 text-sm font-medium">
                <span>Title</span>
                <input
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3"
                  name="title"
                  required
                />
              </label>
              <label className="block space-y-2 text-sm font-medium">
                <span>Type</span>
                <select
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3"
                  defaultValue="GENERAL"
                  name="type"
                >
                  <option value="GENERAL">General update</option>
                  <option value="CLEANUP_CALL">Cleanup call</option>
                  <option value="UPDATE">Progress update</option>
                  <option value="ALERT">Alert</option>
                </select>
              </label>
              <label className="block space-y-2 text-sm font-medium">
                <span>Water body</span>
                <select
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3"
                  defaultValue=""
                  name="waterBodyId"
                >
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
                <textarea
                  className="min-h-[180px] w-full rounded-2xl border border-line bg-white px-4 py-3"
                  name="body"
                  required
                />
              </label>
              <button
                className="w-full rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong"
                type="submit"
              >
                Publish post
              </button>
            </form>

            <form
              action={createCleanupEventAction}
              className="space-y-4 rounded-[1.8rem] border border-line bg-white/75 p-6"
            >
              <div className="section-kicker">Cleanup event</div>
              <h2 className="font-display text-3xl font-semibold tracking-[-0.04em]">
                Create a turnout-ready cleanup
              </h2>
              <p className="text-sm leading-7 text-muted">
                Use this when a hotspot is real and people can meet with a clear
                time, place, and organizer.
              </p>
              <label className="block space-y-2 text-sm font-medium">
                <span>Title</span>
                <input
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3"
                  name="title"
                  required
                />
              </label>
              <label className="block space-y-2 text-sm font-medium">
                <span>Water body</span>
                <select
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3"
                  name="waterBodyId"
                  required
                >
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
                  <input
                    className="w-full rounded-2xl border border-line bg-white px-4 py-3"
                    defaultValue="12.9716"
                    name="latitude"
                    required
                    step="0.0001"
                    type="number"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  <span>Longitude</span>
                  <input
                    className="w-full rounded-2xl border border-line bg-white px-4 py-3"
                    defaultValue="77.5946"
                    name="longitude"
                    required
                    step="0.0001"
                    type="number"
                  />
                </label>
              </div>
              <label className="block space-y-2 text-sm font-medium">
                <span>Address or meeting point</span>
                <input
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3"
                  name="address"
                />
              </label>
              <label className="block space-y-2 text-sm font-medium">
                <span>Description</span>
                <textarea
                  className="min-h-[160px] w-full rounded-2xl border border-line bg-white px-4 py-3"
                  name="description"
                  required
                />
              </label>
              <label className="block space-y-2 text-sm font-medium">
                <span>Scheduled at</span>
                <input
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3"
                  name="scheduledAt"
                  required
                  type="datetime-local"
                />
              </label>
              <button
                className="w-full rounded-full bg-[#0d2732] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
                type="submit"
              >
                Launch cleanup event
              </button>
            </form>
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          <section className="shell-frame rounded-[1.8rem] px-5 py-5">
            <div className="section-kicker">Water-body channels</div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em]">
              Where local activity is actually happening
            </h2>
            <div className="mt-5 space-y-3">
              {waterBodyBoards.length > 0 ? (
                waterBodyBoards.map((board) => (
                  <article
                    key={board.label}
                    className="rounded-[1.35rem] border border-line bg-white/72 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">{board.label}</h3>
                        <p className="mt-1 text-sm text-muted">
                          Latest update {formatDateTime(board.latestAt)}
                        </p>
                      </div>
                      <Badge tone="brand">{board.postCount} posts</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {board.cleanupCount > 0 ? (
                        <Badge tone="success">{board.cleanupCount} cleanup ops</Badge>
                      ) : null}
                      {board.alertCount > 0 ? (
                        <Badge tone="danger">{board.alertCount} alerts / calls</Badge>
                      ) : null}
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm text-muted">
                  Local channels will appear as soon as people start posting around
                  specific water bodies.
                </p>
              )}
            </div>
          </section>

          <ResponderList
            description="Use these when a cleanup or local campaign needs volunteer turnout, field coordination, or waste-response support."
            responders={ngoResponders}
            title="Community action channels"
          />

          <ResponderList
            description="Use these when a report needs official routing, regulator visibility, or municipal ownership."
            responders={officialResponders}
            title="Escalation channels"
          />
        </aside>
      </div>
    </section>
  );
}
