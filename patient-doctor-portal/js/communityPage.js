import {
  listApprovedPosts,
  listMyPosts,
  listComments,
  addPostLocal,
  addCommentLocal,
  moderateLocal,
} from "./communityStorage.js";
import { apiFetch } from "./backend.js";

/**
 * @param {HTMLElement} root
 * @param {object} deps
 */
export function mountCommunityPage(root, deps) {
  const { session, renderHeader, bindLogout, escapeHtml, isApiMode } = deps;
  let posts = [];
  let expandedPostId = null;
  let commentsCache = {};

  async function loadPosts() {
    if (isApiMode()) {
      posts = await apiFetch("/community/posts");
      return;
    }
    posts = listApprovedPosts();
  }

  async function loadComments(postId) {
    if (isApiMode()) {
      commentsCache[postId] = await apiFetch(`/community/posts/${encodeURIComponent(postId)}/comments`);
      return;
    }
    commentsCache[postId] = listComments(postId);
  }

  function renderPostCard(p) {
    const statusBadge =
      p.status !== "approved"
        ? `<span class="badge badge-status-${escapeHtml(p.status)}">${escapeHtml(p.status)}</span>`
        : "";
    return `
      <article class="community-post" data-post-id="${escapeHtml(p.id)}">
        <div class="community-post-head">
          <strong>${escapeHtml(p.authorDisplay)}</strong>
          <span class="muted">${escapeHtml(p.createdAt)}</span>
          ${statusBadge}
        </div>
        <p class="community-post-body">${escapeHtml(p.body)}</p>
        ${
          p.status !== "approved"
            ? `<p class="muted community-mod-note">${escapeHtml(p.moderationReason || "")}</p>`
            : ""
        }
        ${
          p.status === "approved"
            ? `<button type="button" class="btn btn-ghost btn-sm community-toggle-comments" data-pid="${escapeHtml(p.id)}">
                Comments (${p.commentCount || 0})
              </button>
              <div class="community-comments" id="comments-${escapeHtml(p.id)}" style="display:none;"></div>
              <form class="community-comment-form" data-pid="${escapeHtml(p.id)}" style="display:none;">
                <input type="text" name="body" placeholder="Write a supportive comment…" maxlength="500" required />
                <button class="btn btn-primary" type="submit">Comment</button>
              </form>`
            : ""
        }
      </article>`;
  }

  const render = async () => {
    root.innerHTML =
      renderHeader(session) +
      `
      <main>
        <div class="card">
          <h1>Community</h1>
          <p class="muted">Peer support for people navigating PCOS and related conditions. Posts are reviewed automatically before publishing. No diagnoses or emergency care here.</p>
          <div class="callout callout-support">
            Share encouragement, coping strategies, or questions for your clinician—use “I feel” / “my experience”. Avoid naming doctors, sharing contact info, or telling others what disease they have.
          </div>
          <h2>Share with the community</h2>
          <form id="communityPostForm" class="community-compose">
            <textarea id="communityPostBody" rows="4" placeholder="e.g. It took years before anyone took my pain seriously…" maxlength="2000" required></textarea>
            <button class="btn btn-primary" type="submit">Submit for review</button>
          </form>
          <p id="communityPostMsg" class="muted"></p>
          <h2>Feed</h2>
          <div id="communityFeed" class="community-feed">
            <p class="muted">Loading…</p>
          </div>
          <p class="muted" style="margin-top:12px;">Flagged content is reviewed under <strong>Doctor → Moderation</strong>.</p>
        </div>
      </main>`;

    bindLogout();

    try {
      await loadPosts();
      const feed = document.getElementById("communityFeed");
      feed.innerHTML =
        posts.length === 0
          ? `<p class="muted">No posts yet. Share yours above—it will appear here after safety review.</p>`
          : posts.map(renderPostCard).join("");
    } catch (e) {
      document.getElementById("communityFeed").innerHTML = `<p class="muted">${escapeHtml(
        e instanceof Error ? e.message : String(e)
      )}</p>`;
    }

    document.getElementById("communityPostForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = document.getElementById("communityPostMsg");
      const body = document.getElementById("communityPostBody").value.trim();
      msg.textContent = "Reviewing your post for safety…";
      try {
        let result;
        if (isApiMode()) {
          result = await apiFetch("/community/posts", {
            method: "POST",
            body: JSON.stringify({ body }),
          });
        } else {
          const mod = moderateLocal(body);
          result = addPostLocal({
            id: crypto.randomUUID(),
            authorId: session.patientId,
            authorDisplay: session.displayName,
            body,
            status: mod.approved ? "approved" : "rejected",
            moderationReason: mod.reason,
            createdAt: new Date().toISOString(),
          });
        }
        document.getElementById("communityPostBody").value = "";
        if (result.status === "approved") {
          msg.textContent = "Published — thank you for contributing.";
        } else {
          msg.textContent = `Not published: ${result.moderationReason}`;
        }
        await render();
      } catch (err) {
        msg.textContent = err instanceof Error ? err.message : String(err);
      }
    });

    root.querySelectorAll(".community-toggle-comments").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const pid = btn.getAttribute("data-pid");
        const box = document.getElementById(`comments-${pid}`);
        const form = root.querySelector(`form.community-comment-form[data-pid="${pid}"]`);
        if (!box) return;
        const open = box.style.display !== "none";
        if (open) {
          box.style.display = "none";
          if (form) form.style.display = "none";
          return;
        }
        await loadComments(pid);
        const comments = commentsCache[pid] || [];
        box.innerHTML =
          comments.length === 0
            ? `<p class="muted">No comments yet.</p>`
            : comments
                .map(
                  (c) =>
                    `<div class="community-comment"><strong>${escapeHtml(c.authorDisplay)}</strong> <span class="muted">${escapeHtml(c.createdAt)}</span><p>${escapeHtml(c.body)}</p></div>`
                )
                .join("");
        box.style.display = "block";
        if (form) form.style.display = "flex";
      });
    });

    root.querySelectorAll(".community-comment-form").forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const pid = form.getAttribute("data-pid");
        const input = form.querySelector('input[name="body"]');
        const text = (input?.value || "").trim();
        if (!text) return;
        try {
          if (isApiMode()) {
            await apiFetch(`/community/posts/${encodeURIComponent(pid)}/comments`, {
              method: "POST",
              body: JSON.stringify({ body: text }),
            });
          } else {
            const mod = moderateLocal(text);
            addCommentLocal(pid, {
              id: crypto.randomUUID(),
              postId: pid,
              authorDisplay: session.displayName,
              body: text,
              status: mod.approved ? "approved" : "rejected",
              moderationReason: mod.reason,
              createdAt: new Date().toISOString(),
            });
          }
          input.value = "";
          await loadComments(pid);
          const box = document.getElementById(`comments-${pid}`);
          const comments = commentsCache[pid] || [];
          box.innerHTML = comments
            .map(
              (c) =>
                `<div class="community-comment"><strong>${escapeHtml(c.authorDisplay)}</strong><p>${escapeHtml(c.body)}</p></div>`
            )
            .join("");
        } catch (err) {
          alert(err instanceof Error ? err.message : String(err));
        }
      });
    });
  };

  render();
}
