/**
 * Offline community feed (localStorage demo).
 */
const NS = "pdportal_v1:community";

function load(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}

export function listApprovedPosts() {
  return load(`${NS}:posts`).filter((p) => p.status === "approved");
}

export function listMyPosts(authorId) {
  return load(`${NS}:posts`).filter((p) => p.authorId === authorId);
}

export function listComments(postId) {
  return load(`${NS}:comments:${postId}`).filter((c) => c.status === "approved");
}

/** @param {object} post */
export function addPostLocal(post) {
  const all = load(`${NS}:posts`);
  all.unshift(post);
  save(`${NS}:posts`, all);
  return post;
}

/** @param {object} comment */
export function addCommentLocal(postId, comment) {
  const key = `${NS}:comments:${postId}`;
  const all = load(key);
  all.push(comment);
  save(key, all);
  return comment;
}

/** Simple offline moderation */
export function moderateLocal(text) {
  const t = (text || "").toLowerCase();
  if (/\byou have pcos\b|\btake \d+ mg\b|@[\w.-]+\.\w+/.test(t)) {
    return {
      approved: false,
      reason: "Please avoid diagnosis claims, dosing advice, or email addresses.",
      flags: ["policy"],
    };
  }
  if (/suicid|kill myself|severe bleeding/.test(t)) {
    return {
      approved: false,
      reason: "If this is an emergency, contact local urgent care. This community cannot provide crisis support.",
      flags: ["emergency"],
    };
  }
  return { approved: true, reason: "Approved by community safety rules.", flags: [] };
}
