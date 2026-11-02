
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  GitBranch,
  ArrowUpRight,
  Sparkles,
  Code2,
  ShieldCheck,
  Database,
  Palette,
  BrainCircuit,
  Terminal,
  Heart,
  Menu,
  X,
  SlidersHorizontal,
  ExternalLink,
  Globe,
  Layers,
  Rocket,
} from "lucide-react";

type Application = {
  id: number;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  category_id: number;
  category_name: string;
  repository_url: string | null;
  official_website: string | null;
  download_url: string | null;
  license: string | null;
  project_type: "source" | "installer";
  version: string | null;
  logo_url: string | null;
  developer_id: number;
  created_at: string;
};

const categories = [
  { name: "All Applications", icon: Layers },
  { name: "Developer Tools", icon: Terminal },
  { name: "AI & Machine Learning", icon: BrainCircuit },
  { name: "Productivity", icon: Sparkles },
  { name: "Security", icon: ShieldCheck },
  { name: "Databases", icon: Database },
  { name: "Design", icon: Palette },
];

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

function isApplication(value: unknown): value is Application {
  if (typeof value !== "object" || value === null) return false;

  const application = value as Record<string, unknown>;
  return (
    typeof application.id === "number" &&
    typeof application.name === "string" &&
    typeof application.slug === "string" &&
    typeof application.short_description === "string" &&
    typeof application.description === "string" &&
    typeof application.category_id === "number" &&
    typeof application.category_name === "string" &&
    (typeof application.repository_url === "string" ||
      application.repository_url === null) &&
    (typeof application.official_website === "string" ||
      application.official_website === null) &&
    (typeof application.download_url === "string" ||
      application.download_url === null) &&
    (typeof application.license === "string" || application.license === null) &&
    (application.project_type === "source" ||
      application.project_type === "installer") &&
    (typeof application.version === "string" || application.version === null) &&
    (typeof application.logo_url === "string" || application.logo_url === null) &&
    typeof application.developer_id === "number" &&
    typeof application.created_at === "string" &&
    !Number.isNaN(Date.parse(application.created_at))
  );
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function Home() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Applications");
  const [sort, setSort] = useState("recent");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [failedLogos, setFailedLogos] = useState<number[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    if (!apiBaseUrl) {
      return () => controller.abort();
    }

    fetch(`${apiBaseUrl}/api/applications`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`The marketplace request failed (${response.status}).`);
        }

        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.every(isApplication)) {
          throw new Error("The marketplace returned an invalid response.");
        }
        return data;
      })
      .then((data: Application[]) => {
        setApplications(data);
        setFailedLogos([]);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name === "AbortError") {
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load marketplace applications."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [retryCount]);

  const availableCategories = useMemo(() => {
    const categoryNames = [...new Set(applications.map((app) => app.category_name))];
    return [
      categories[0],
      ...categoryNames.map((name) => ({
        name,
        icon: categories.find((item) => item.name === name)?.icon ?? Layers,
      })),
    ];
  }, [applications]);

  const recentlyAdded = useMemo(
    () =>
      [...applications]
        .sort(
          (a, b) =>
            Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id
        )
        .slice(0, 3),
    [applications]
  );

  const filteredProjects = useMemo(() => {
    let result = applications.filter((project) => {
      const term = search.toLowerCase();

      const matchesSearch =
        project.name.toLowerCase().includes(term) ||
        project.description.toLowerCase().includes(term) ||
        project.short_description.toLowerCase().includes(term) ||
        project.category_name.toLowerCase().includes(term);

      const matchesCategory =
        category === "All Applications" ||
        project.category_name === category;

      return matchesSearch && matchesCategory;
    });

    if (sort === "recent") {
      result = [...result].sort(
        (a, b) =>
          Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id
      );
    } else if (sort === "name") {
      result = [...result].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    }

    return result;
  }, [applications, search, category, sort]);

  const toggleFavorite = (id: number) => {
    setFavorites((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };
  const requestError = apiBaseUrl
    ? error
    : "The marketplace API URL is not configured.";
  const isLoading = apiBaseUrl ? loading : false;

  return (
    <main className="min-h-screen bg-[#090b0a] text-white">
      {/* NAVIGATION */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#090b0a]/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-black">
              <Code2 size={23} />
            </div>
            <span className="text-xl font-black tracking-tight">
              OPEN<span className="text-emerald-400">FORGE</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <a href="#explore" className="transition hover:text-emerald-400">Explore</a>
            <a href="#categories" className="transition hover:text-emerald-400">Categories</a>
            <a href="#featured" className="transition hover:text-emerald-400">Recently added</a>
            <a href="#publish" className="transition hover:text-emerald-400">Publish</a>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <Link href="/login" className="rounded-lg px-4 py-2 text-sm text-zinc-300 hover:text-white">
              Sign in
            </Link>
            <Link href="/register" className="rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-emerald-300">
              Get started
            </Link>
          </div>

          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="rounded-lg border border-white/10 p-2 md:hidden"
            aria-label="Toggle navigation"
          >
            {mobileMenu ? <X /> : <Menu />}
          </button>
        </nav>

        {mobileMenu && (
          <div className="border-t border-white/10 bg-[#090b0a] px-5 py-5 md:hidden">
            {["Explore", "Categories", "Featured", "Publish"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={() => setMobileMenu(false)}
                className="block py-3 text-sm text-zinc-300"
              >
                {item}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setMobileMenu(false)}
              className="block py-3 text-sm text-zinc-300"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileMenu(false)}
              className="block py-3 text-sm text-zinc-300"
            >
              Get started
            </Link>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[550px] w-[550px] -translate-x-1/2 rounded-full bg-emerald-500/[0.09] blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-5 py-24 text-center md:py-32">
          <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-2 text-xs font-semibold tracking-wide text-emerald-300">
            <Sparkles size={14} />
            THE OPEN SOURCE DISCOVERY PLATFORM
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-black leading-[1.12] tracking-tight sm:text-6xl md:text-7xl">
            Discover the best of
            <span className="block bg-gradient-to-r from-emerald-300 to-green-500 bg-clip-text text-transparent">
              Open Source.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-zinc-400 md:text-lg">
            Explore powerful open-source applications, discover developer
            tools, evaluate projects and find the right software for your
            next big idea.
          </p>

          <div className="mx-auto mt-10 flex max-w-2xl flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 sm:flex-row">
            <div className="flex flex-1 items-center gap-3 px-4">
              <Search size={20} className="shrink-0 text-zinc-500" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  document.getElementById("explore")?.scrollIntoView({
                    behavior: "smooth",
                  });
                }}
                placeholder="Search applications, tools and technologies..."
                className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-zinc-500"
              />
            </div>
            <button
              onClick={() =>
                document.getElementById("explore")?.scrollIntoView({
                  behavior: "smooth",
                })
              }
              className="rounded-xl bg-emerald-400 px-8 py-3 text-sm font-bold text-black transition hover:bg-emerald-300"
            >
              Explore Projects →
            </button>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-5 text-xs text-zinc-500">
            <span className="flex items-center gap-2"><ShieldCheck size={15} /> Open Source</span>
            <span className="flex items-center gap-2"><Globe size={15} /> Community Driven</span>
            <span className="flex items-center gap-2"><Code2 size={15} /> Developer First</span>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="mb-7">
          <p className="mb-2 text-xs font-bold tracking-widest text-emerald-400">BROWSE BY INTEREST</p>
          <h2 className="text-2xl font-bold">Explore categories</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Find software that matches your workflow.
          </p>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-3">
          {availableCategories.map((item) => {
            const Icon = item.icon;
            const active = category === item.name;

            return (
              <button
                key={item.name}
                onClick={() => {
                  setCategory(item.name);
                  document.getElementById("explore")?.scrollIntoView({
                    behavior: "smooth",
                  });
                }}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition ${
                  active
                    ? "border-emerald-400 bg-emerald-400 text-black"
                    : "border-white/10 bg-white/[0.025] text-zinc-400 hover:border-emerald-400/40 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {item.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* FEATURED */}
      <section id="featured" className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold tracking-widest text-emerald-400">JUST PUBLISHED</p>
            <h2 className="text-3xl font-bold">Recently added</h2>
            <p className="mt-2 text-sm text-zinc-500">
              The latest open-source applications added to the marketplace.
            </p>
          </div>
          <a href="#explore" className="hidden text-sm text-emerald-400 hover:text-emerald-300 sm:block">
            Browse marketplace →
          </a>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {recentlyAdded.map((application) => (
            <article
              key={application.id}
              className="group rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition hover:-translate-y-1 hover:border-emerald-400/40"
            >
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400/20 to-green-500/10 text-emerald-300">
                {application.logo_url && !failedLogos.includes(application.id) ? (
                  <Image
                    src={application.logo_url}
                    alt={`${application.name} logo`}
                    width={56}
                    height={56}
                    unoptimized
                    onError={() =>
                      setFailedLogos((previous) =>
                        previous.includes(application.id)
                          ? previous
                          : [...previous, application.id]
                      )
                    }
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <Code2 size={26} />
                )}
              </div>
              <p className="mt-5 text-xs text-emerald-400">{application.category_name}</p>
              <h3 className="mt-2 text-xl font-bold">{application.name}</h3>
              <p className="mt-3 min-h-[60px] text-sm leading-6 text-zinc-400">{application.short_description}</p>
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-zinc-500">
                <span>
                  {application.version
                    ? `Version ${application.version}`
                    : application.license ?? "Open source"}
                </span>
                <span>{formatDate(application.created_at)}</span>
              </div>
              {(application.repository_url ||
                application.download_url ||
                application.official_website) && (
                <a
                  href={
                    application.repository_url ??
                    application.download_url ??
                    application.official_website ??
                    undefined
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-white/10 py-3 text-sm transition hover:border-emerald-400 hover:text-emerald-300"
                >
                  {application.repository_url
                    ? "View repository"
                    : application.download_url
                      ? "Download application"
                      : "Official website"}{" "}
                  <ArrowUpRight size={16} />
                </a>
              )}
            </article>
          ))}
          {isLoading && (
            <p className="text-sm text-zinc-500">Loading recently added applications…</p>
          )}
          {requestError && (
            <p className="text-sm text-zinc-500">Recently added applications are unavailable.</p>
          )}
        </div>
      </section>

      {/* MARKETPLACE */}
      <section id="explore" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold tracking-widest text-emerald-400">DISCOVER SOMETHING NEW</p>
            <h2 className="text-3xl font-bold">Explore applications</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Discover open-source software from across the ecosystem.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">
              {isLoading ? "Loading…" : `${filteredProjects.length} results`}
            </span>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3">
              <SlidersHorizontal size={15} className="text-zinc-500" />
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="bg-transparent py-3 text-sm text-zinc-300 outline-none"
                aria-label="Sort applications"
              >
                <option value="recent" className="bg-[#111]">Recently added</option>
                <option value="name" className="bg-[#111]">Name A–Z</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mb-7 flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1.5 text-xs text-emerald-300">
            {category}
          </span>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-400"
            >
              Search: {search} ×
            </button>
          )}
          {category !== "All Applications" && (
            <button
              onClick={() => setCategory("All Applications")}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-400"
            >
              Clear category ×
            </button>
          )}
        </div>

        {requestError && (
          <div className="mb-7 rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-6 text-center" role="alert">
            <p className="text-sm text-zinc-300">{requestError}</p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                setRetryCount((count) => count + 1);
              }}
              className="mt-4 rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-emerald-300"
            >
              Try again
            </button>
          </div>
        )}

        {isLoading && !requestError && (
          <div className="rounded-2xl border border-white/10 py-20 text-center" role="status">
            <p className="text-sm text-zinc-400">Loading marketplace applications…</p>
          </div>
        )}

        {!isLoading && !requestError && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((application) => (
            <article
              key={application.id}
              className="group rounded-2xl border border-white/[0.09] bg-[#101311] p-6 transition duration-300 hover:-translate-y-1 hover:border-emerald-400/40 hover:bg-[#131a15]"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-emerald-400/20 to-green-500/10 text-emerald-300">
                  {application.logo_url && !failedLogos.includes(application.id) ? (
                    <Image
                      src={application.logo_url}
                      alt={`${application.name} logo`}
                      width={56}
                      height={56}
                      unoptimized
                      onError={() =>
                        setFailedLogos((previous) =>
                          previous.includes(application.id)
                            ? previous
                            : [...previous, application.id]
                        )
                      }
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <Code2 size={24} />
                  )}
                </div>

                <button
                  onClick={() => toggleFavorite(application.id)}
                  aria-label={favorites.includes(application.id) ? "Remove favorite" : "Add favorite"}
                  className="rounded-lg border border-white/10 p-2 text-zinc-500 transition hover:text-pink-400"
                >
                  <Heart
                    size={17}
                    fill={favorites.includes(application.id) ? "currentColor" : "none"}
                    className={favorites.includes(application.id) ? "text-pink-400" : ""}
                  />
                </button>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-emerald-400">{application.category_name}</p>
                  {application.license && (
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-400">
                      {application.license}
                    </span>
                  )}
                </div>

                <h3 className="mt-3 text-xl font-bold transition group-hover:text-emerald-300">
                  {application.name}
                </h3>

                <p className="mt-3 min-h-[65px] text-sm leading-6 text-zinc-400">
                  {application.short_description}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-zinc-500">
                <span>
                  {application.version
                    ? `Version ${application.version}`
                    : application.project_type === "source"
                      ? "Open source"
                      : "Installer"}
                </span>
                <span>Added {formatDate(application.created_at)}</span>
              </div>

              <div className="mt-5 flex flex-col gap-2">
                {application.repository_url && (
                  <a
                    href={application.repository_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-3 text-sm font-medium transition hover:border-emerald-400 hover:text-emerald-300"
                  >
                    <GitBranch size={16} /> View source code <ExternalLink size={13} />
                  </a>
                )}
                {application.download_url && (
                  <a
                    href={application.download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-3 text-sm font-medium transition hover:border-emerald-400 hover:text-emerald-300"
                  >
                    Download <ArrowUpRight size={15} />
                  </a>
                )}
                {application.official_website && (
                  <a
                    href={application.official_website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-center text-xs text-zinc-500 transition hover:text-emerald-300"
                  >
                    Official website
                  </a>
                )}
              </div>
            </article>
          ))}

        {filteredProjects.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
            <Search size={35} className="mx-auto text-zinc-600" />
            <h3 className="mt-5 text-xl font-semibold">No applications found</h3>
            <p className="mt-2 text-sm text-zinc-500">
              Try a different keyword or category.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setCategory("All Applications");
              }}
              className="mt-6 rounded-lg bg-emerald-400 px-5 py-3 text-sm font-bold text-black"
            >
              Clear all filters
            </button>
          </div>
        )}
        </div>
        )}
      </section>

      {/* PUBLISH CTA */}
      <section id="publish" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/[0.10] to-green-900/[0.05] px-7 py-16 text-center md:px-16">
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[90px]" />
          <div className="relative">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-black">
              <Rocket size={27} />
            </div>
            <h2 className="mt-7 text-3xl font-bold md:text-4xl">
              Built something amazing?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-400">
              Share your open-source repository with the community.
              Help developers discover tools that make a difference.
            </p>
            <a
              href="/dashboard"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-7 py-3.5 text-sm font-bold text-black transition hover:bg-emerald-300"
            >
              Publish a project <ArrowUpRight size={17} />
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.08]">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-5 py-9 md:flex-row md:items-center lg:px-8">
          <div>
            <p className="text-xl font-black">
              OPEN<span className="text-emerald-400">FORGE</span>
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Discover. Evaluate. Access. Contribute.
            </p>
          </div>

          <div className="flex flex-wrap gap-6 text-xs text-zinc-500">
            <a href="#explore" className="hover:text-white">Explore</a>
            <a href="#categories" className="hover:text-white">Categories</a>
            <a href="https://GitBranch.com/" target="_blank" rel="noreferrer" className="hover:text-white">GitBranch</a>
          </div>

          <p className="text-xs text-zinc-600">
            © 2026 OpenForge. Under development.
          </p>
        </div>
      </footer>
    </main>
  );
}
