"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  Category,
  clearAccessToken,
  createSubmission,
  getAccessToken,
  getCategories,
  getCurrentUser,
  getMySubmissions,
  Submission,
  SubmissionInput,
  User,
} from "@/lib/api";

const inputClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-emerald-400";

function optionalValue(value: FormDataEntryValue | null): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

export default function DeveloperDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [projectType, setProjectType] = useState<"source" | "installer">("source");

  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    const token = accessToken;

    async function loadDashboard() {
      try {
        const profile = await getCurrentUser(token);
        if (profile.role === "admin") {
          router.replace("/admin");
          return;
        }
        if (profile.role !== "developer") {
          clearAccessToken();
          router.replace("/login");
          return;
        }

        const [availableCategories, ownSubmissions] = await Promise.all([
          getCategories(),
          getMySubmissions(token),
        ]);
        setUser(profile);
        setCategories(availableCategories);
        setSubmissions(ownSubmissions);
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
            : "Unable to load your dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const formElement = event.currentTarget;
    setError(null);
    setNotice(null);
    setSubmitting(true);

    const formData = new FormData(formElement);
    const submission: SubmissionInput = {
      proposed_name: String(formData.get("proposed_name") ?? "").trim(),
      short_description: String(formData.get("short_description") ?? "").trim(),
      description: optionalValue(formData.get("description")),
      category_id: Number(formData.get("category_id")),
      project_type: projectType,
      repository_url: optionalValue(formData.get("repository_url")),
      official_website: optionalValue(formData.get("official_website")),
      download_url: optionalValue(formData.get("download_url")),
      license: optionalValue(formData.get("license")),
      version: optionalValue(formData.get("version")),
      logo_url: optionalValue(formData.get("logo_url")),
    };

    try {
      await createSubmission(token, submission);
      setNotice("Your application was submitted and is waiting for admin review.");
      const refreshedSubmissions = await getMySubmissions(token);
      setSubmissions(refreshedSubmissions);
      formElement.reset();
      setProjectType("source");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to submit this application."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090b0a] text-sm text-zinc-400">
        Loading your developer dashboard…
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
            <h1 className="mt-4 text-3xl font-bold">Developer dashboard</h1>
            {user && <p className="mt-2 text-sm text-zinc-400">Signed in as {user.full_name}</p>}
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

        <section className="rounded-3xl border border-white/10 bg-[#101311] p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Submit an application</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Submissions remain pending until an administrator reviews them.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 grid gap-5 sm:grid-cols-2">
            <label className="text-sm text-zinc-300 sm:col-span-2">
              Project name *
              <input
                name="proposed_name"
                required
                minLength={1}
                maxLength={150}
                className={inputClass}
              />
            </label>
            <label className="text-sm text-zinc-300 sm:col-span-2">
              Short description *
              <textarea
                name="short_description"
                required
                maxLength={300}
                rows={2}
                className={inputClass}
              />
            </label>
            <label className="text-sm text-zinc-300 sm:col-span-2">
              Full description
              <textarea name="description" rows={4} className={inputClass} />
            </label>
            <label className="text-sm text-zinc-300">
              Category *
              <select name="category_id" required defaultValue="" className={inputClass}>
                <option value="" disabled className="bg-[#101311]">
                  Select a category
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id} className="bg-[#101311]">
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-zinc-300">
              Project type *
              <select
                value={projectType}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "source" || value === "installer") {
                    setProjectType(value);
                  }
                }}
                className={inputClass}
              >
                <option value="source" className="bg-[#101311]">Source code</option>
                <option value="installer" className="bg-[#101311]">Installer / download</option>
              </select>
            </label>
            {projectType === "source" ? (
              <label className="text-sm text-zinc-300 sm:col-span-2">
                GitHub repository URL *
                <input
                  type="url"
                  name="repository_url"
                  required
                  maxLength={500}
                  placeholder="https://github.com/owner/project"
                  className={inputClass}
                />
              </label>
            ) : (
              <label className="text-sm text-zinc-300 sm:col-span-2">
                Download URL *
                <input
                  type="url"
                  name="download_url"
                  required
                  maxLength={500}
                  placeholder="https://example.com/download"
                  className={inputClass}
                />
              </label>
            )}
            {projectType === "source" && (
              <label className="text-sm text-zinc-300 sm:col-span-2">
                Download URL
                <input
                  type="url"
                  name="download_url"
                  maxLength={500}
                  placeholder="https://example.com/download"
                  className={inputClass}
                />
              </label>
            )}
            <label className="text-sm text-zinc-300">
              Official website
              <input type="url" name="official_website" maxLength={500} className={inputClass} />
            </label>
            <label className="text-sm text-zinc-300">
              Logo URL
              <input type="url" name="logo_url" maxLength={500} className={inputClass} />
            </label>
            <label className="text-sm text-zinc-300">
              License
              <input name="license" maxLength={100} className={inputClass} />
            </label>
            <label className="text-sm text-zinc-300">
              Version
              <input name="version" maxLength={50} className={inputClass} />
            </label>

            {notice && (
              <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm text-emerald-200 sm:col-span-2" role="status">
                {notice}
              </p>
            )}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitting || categories.length === 0}
                className="rounded-xl bg-emerald-400 px-6 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit for review"}
              </button>
            </div>
          </form>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Your submissions</h2>
          <div className="mt-5 space-y-4">
            {submissions.map((submission) => (
              <article
                key={submission.id}
                className="rounded-2xl border border-white/10 bg-[#101311] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{submission.proposed_name}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{submission.short_description}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs capitalize text-emerald-300">
                    {submission.status}
                  </span>
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                </p>
                {submission.admin_comment && (
                  <p className="mt-3 rounded-xl bg-white/[0.04] p-3 text-sm text-zinc-300">
                    Admin comment: {submission.admin_comment}
                  </p>
                )}
              </article>
            ))}
            {submissions.length === 0 && (
              <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
                You have not submitted any applications yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
