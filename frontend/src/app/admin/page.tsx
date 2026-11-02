"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ApiError,
  approveSubmission,
  clearAccessToken,
  getAccessToken,
  getCurrentUser,
  getPendingSubmissions,
  rejectSubmission,
  Submission,
  User,
} from "@/lib/api";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<User | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [comments, setComments] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    const token = accessToken;

    async function loadAdminQueue() {
      try {
        const profile = await getCurrentUser(token);
        if (profile.role !== "admin") {
          router.replace("/dashboard");
          return;
        }
        const pending = await getPendingSubmissions(token);
        setAdmin(profile);
        setSubmissions(pending);
        setError(null);
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.status === 401) {
          clearAccessToken();
          router.replace("/login");
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load pending submissions."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadAdminQueue();
  }, [router]);

  async function refreshQueue() {
    const accessToken = getAccessToken();
    if (!accessToken) return;
    setSubmissions(await getPendingSubmissions(accessToken));
  }

  async function reviewSubmission(
    submissionId: number,
    action: "approve" | "reject"
  ) {
    const accessToken = getAccessToken();
    if (!accessToken) {
      router.replace("/login");
      return;
    }

    setError(null);
    setNotice(null);
    setBusyId(submissionId);
    try {
      if (action === "approve") {
        await approveSubmission(accessToken, submissionId);
        setNotice("Application approved and published to the marketplace.");
      } else {
        const adminComment = comments[submissionId]?.trim() ?? "";
        if (!adminComment) {
          setError("Enter an admin comment before rejecting a submission.");
          return;
        }
        await rejectSubmission(accessToken, submissionId, adminComment);
        setNotice("Submission rejected.");
      }
      await refreshQueue();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to review this submission."
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090b0a] text-sm text-zinc-400">
        Loading admin dashboard…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090b0a] px-5 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-sm font-bold tracking-wide text-emerald-300">
              OPENFORGE
            </Link>
            <h1 className="mt-4 text-3xl font-bold">Admin dashboard</h1>
            {admin && <p className="mt-2 text-sm text-zinc-400">Signed in as {admin.full_name}</p>}
          </div>
          <button
            onClick={() => {
              clearAccessToken();
              router.replace("/login");
            }}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:border-emerald-400/50"
          >
            Sign out
          </button>
        </header>

        {error && (
          <p className="mb-6 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-200" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="mb-6 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm text-emerald-200" role="status">
            {notice}
          </p>
        )}

        <section>
          <h2 className="text-xl font-semibold">Pending submissions</h2>
          <div className="mt-5 space-y-5">
            {submissions.map((submission) => (
              <article
                key={submission.id}
                className="rounded-2xl border border-white/10 bg-[#101311] p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{submission.proposed_name}</h3>
                    <p className="mt-2 text-sm text-zinc-400">{submission.short_description}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs capitalize text-amber-300">
                    {submission.project_type}
                  </span>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                  {submission.description}
                </p>
                <dl className="mt-4 grid gap-2 text-sm text-zinc-400 sm:grid-cols-2">
                  <div>
                    <dt className="inline text-zinc-500">Developer ID: </dt>
                    <dd className="inline">{submission.developer_id}</dd>
                  </div>
                  <div>
                    <dt className="inline text-zinc-500">Category ID: </dt>
                    <dd className="inline">{submission.category_id}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  {submission.repository_url && (
                    <a className="text-emerald-300 hover:text-emerald-200" href={submission.repository_url} target="_blank" rel="noreferrer">
                      Repository
                    </a>
                  )}
                  {submission.download_url && (
                    <a className="text-emerald-300 hover:text-emerald-200" href={submission.download_url} target="_blank" rel="noreferrer">
                      Download
                    </a>
                  )}
                  {submission.official_website && (
                    <a className="text-emerald-300 hover:text-emerald-200" href={submission.official_website} target="_blank" rel="noreferrer">
                      Official website
                    </a>
                  )}
                </div>
                <div className="mt-6 border-t border-white/10 pt-5">
                  <label className="block text-sm text-zinc-300">
                    Admin comment (required to reject)
                    <textarea
                      rows={2}
                      value={comments[submission.id] ?? ""}
                      onChange={(event) =>
                        setComments((previous) => ({
                          ...previous,
                          [submission.id]: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-emerald-400"
                    />
                  </label>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      disabled={busyId === submission.id}
                      onClick={() => void reviewSubmission(submission.id, "approve")}
                      className="rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-emerald-300 disabled:opacity-60"
                    >
                      {busyId === submission.id ? "Working…" : "Approve and publish"}
                    </button>
                    <button
                      disabled={busyId === submission.id}
                      onClick={() => void reviewSubmission(submission.id, "reject")}
                      className="rounded-xl border border-red-400/30 px-5 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-400/[0.08] disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {submissions.length === 0 && (
              <p className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">
                There are no pending submissions.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
