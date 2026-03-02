import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

const initialStudents = {
  name: "",
  email: "",
  phone: "",
  branch: "",
  cgpa: "",
  graduation_year: "",
};
const initialCompany = { company_name: "", location: "", min_cgpa: "" };
const initialJob = { company_id: "", role: "", salary_package: "", last_date: "" };
const initialApplication = { student_id: "", job_id: "", status: "Applied" };
const initialAdmin = { username: "", password: "" };

function App() {
  const [activeSection, setActiveSection] = useState("overview");
  const [health, setHealth] = useState(null);
  const [source, setSource] = useState("unknown");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [admins, setAdmins] = useState([]);

  const [studentForm, setStudentForm] = useState(initialStudents);
  const [companyForm, setCompanyForm] = useState(initialCompany);
  const [jobForm, setJobForm] = useState(initialJob);
  const [applicationForm, setApplicationForm] = useState(initialApplication);
  const [adminForm, setAdminForm] = useState(initialAdmin);

  const companyNameMap = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.company_id, c.company_name])),
    [companies]
  );
  const studentNameMap = useMemo(
    () => Object.fromEntries(students.map((s) => [s.student_id, s.name])),
    [students]
  );

  const metrics = [
    { label: "Students", value: students.length, tone: "from-cyan-400/40 to-cyan-700/20" },
    { label: "Companies", value: companies.length, tone: "from-emerald-400/40 to-emerald-700/20" },
    { label: "Jobs", value: jobs.length, tone: "from-amber-300/40 to-amber-700/20" },
    { label: "Applications", value: applications.length, tone: "from-pink-300/40 to-pink-700/20" },
    { label: "Admins", value: admins.length, tone: "from-violet-300/40 to-violet-700/20" },
  ];
  const sidebarItems = ["overview", "students", "companies", "jobs", "applications", "admins"];

  const api = async (path, options = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      throw new Error(data?.message || `Request failed: ${path}`);
    }
    return data;
  };

  const loadAll = async () => {
    setBusy(true);
    setError("");
    try {
      const [h, s, c, j, a, ad] = await Promise.all([
        api("/health"),
        api("/api/students"),
        api("/api/companies"),
        api("/api/jobs"),
        api("/api/applications"),
        api("/api/admins"),
      ]);
      setHealth(h);
      setStudents(s.data || []);
      setCompanies(c.data || []);
      setJobs(j.data || []);
      setApplications(a.data || []);
      setAdmins(ad.data || []);
      setSource(s.source || "unknown");
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const submit = async (path, body, resetter) => {
    setBusy(true);
    setError("");
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) });
      resetter();
      await loadAll();
    } catch (err) {
      setError(err.message || "Submit failed");
      setBusy(false);
    }
  };

  const remove = async (path) => {
    setBusy(true);
    setError("");
    try {
      await api(path, { method: "DELETE" });
      await loadAll();
    } catch (err) {
      setError(err.message || "Delete failed");
      setBusy(false);
    }
  };

  const updateApplicationStatus = async (id, status) => {
    setBusy(true);
    setError("");
    try {
      await api(`/api/applications/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadAll();
    } catch (err) {
      setError(err.message || "Status update failed");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto flex max-w-[1600px] gap-5 px-4 py-6 lg:px-6">
        <aside className="dashboard-card hidden w-72 shrink-0 p-5 lg:block">
          <p className="font-body text-xs uppercase tracking-[0.35em] text-cyan-200/80">
            Placement OS
          </p>
          <h1 className="mt-3 font-heading text-3xl leading-tight">Control Dashboard</h1>
          <p className="mt-3 text-sm text-slate-300/80">
            Premium interface to manage your full placement schema.
          </p>

          <div className="mt-6 space-y-3">
            {sidebarItems.map((item) => (
              <button
                key={item}
                className={`side-link ${activeSection === item ? "active" : ""}`}
                onClick={() => setActiveSection(item)}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-3 text-xs uppercase tracking-[0.2em] text-slate-300">
            <p>Source: {source}</p>
            <p className="mt-2">Server: {health?.ok ? "Running" : "Unknown"}</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-5">
          {activeSection === "overview" && (
          <section className="dashboard-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
                  Placement Management Suite
                </p>
                <h2 className="mt-2 font-heading text-2xl sm:text-4xl">Executive Overview</h2>
              </div>
              <button
                onClick={loadAll}
                disabled={busy}
                className="btn-primary"
              >
                {busy ? "Syncing..." : "Refresh Data"}
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <article
                  key={metric.label}
                  className={`rounded-2xl border border-white/10 bg-gradient-to-r ${metric.tone} p-4`}
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
                    {metric.label}
                  </p>
                  <p className="mt-2 font-heading text-3xl">{metric.value}</p>
                </article>
              ))}
            </div>

            <div className="mt-5">
              <WaveGraph data={metrics.map((m) => ({ label: m.label, value: m.value }))} />
            </div>
          </section>
          )}

          {activeSection === "students" && (
          <section id="students" className="dashboard-card p-5">
            <PanelTitle title="Students" subtitle="Create and manage student profiles" />
            <form
              className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                submit(
                  "/api/students",
                  {
                    ...studentForm,
                    cgpa: studentForm.cgpa ? Number(studentForm.cgpa) : null,
                    graduation_year: studentForm.graduation_year
                      ? Number(studentForm.graduation_year)
                      : null,
                  },
                  () => setStudentForm(initialStudents)
                );
              }}
            >
              <input className="input" placeholder="Name *" value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} required />
              <input className="input" placeholder="Email" value={studentForm.email} onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })} />
              <input className="input" placeholder="Phone" value={studentForm.phone} onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })} />
              <input className="input" placeholder="Branch" value={studentForm.branch} onChange={(e) => setStudentForm({ ...studentForm, branch: e.target.value })} />
              <input className="input" placeholder="CGPA" type="number" step="0.01" value={studentForm.cgpa} onChange={(e) => setStudentForm({ ...studentForm, cgpa: e.target.value })} />
              <input className="input" placeholder="Graduation Year" type="number" value={studentForm.graduation_year} onChange={(e) => setStudentForm({ ...studentForm, graduation_year: e.target.value })} />
              <button className="btn-primary sm:col-span-2 xl:col-span-3" type="submit">Add Student</button>
            </form>
            <DataTable
              columns={["ID", "Name", "Branch", "CGPA", "Action"]}
              rows={students.map((s) => [
                s.student_id,
                s.name,
                s.branch,
                s.cgpa,
                <button className="btn-danger" onClick={() => remove(`/api/students/${s.student_id}`)}>Delete</button>,
              ])}
            />
          </section>
          )}

          {activeSection === "companies" && (
            <section id="companies" className="dashboard-card p-5">
              <PanelTitle title="Companies" subtitle="Track hiring partners" />
              <form
                className="mt-4 grid gap-3 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit("/api/companies", companyForm, () => setCompanyForm(initialCompany));
                }}
              >
                <input className="input" placeholder="Company Name *" value={companyForm.company_name} onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })} required />
                <input className="input" placeholder="Location" value={companyForm.location} onChange={(e) => setCompanyForm({ ...companyForm, location: e.target.value })} />
                <input className="input sm:col-span-2" placeholder="Min CGPA" type="number" step="0.01" value={companyForm.min_cgpa} onChange={(e) => setCompanyForm({ ...companyForm, min_cgpa: e.target.value })} />
                <button className="btn-primary sm:col-span-2" type="submit">Add Company</button>
              </form>
              <DataTable
                columns={["ID", "Company", "Location", "Action"]}
                rows={companies.map((c) => [
                  c.company_id,
                  c.company_name,
                  c.location,
                  <button className="btn-danger" onClick={() => remove(`/api/companies/${c.company_id}`)}>Delete</button>,
                ])}
              />
            </section>
          )}

          {activeSection === "jobs" && (
            <section id="jobs" className="dashboard-card p-5">
              <PanelTitle title="Jobs" subtitle="Open roles and compensation" />
              <form
                className="mt-4 grid gap-3 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(
                    "/api/jobs",
                    { ...jobForm, company_id: Number(jobForm.company_id) },
                    () => setJobForm(initialJob)
                  );
                }}
              >
                <select className="input" value={jobForm.company_id} onChange={(e) => setJobForm({ ...jobForm, company_id: e.target.value })} required>
                  <option value="">Select Company</option>
                  {companies.map((c) => (
                    <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
                  ))}
                </select>
                <input className="input" placeholder="Role" value={jobForm.role} onChange={(e) => setJobForm({ ...jobForm, role: e.target.value })} />
                <input className="input" placeholder="Salary Package" type="number" step="0.01" value={jobForm.salary_package} onChange={(e) => setJobForm({ ...jobForm, salary_package: e.target.value })} />
                <input className="input" type="date" value={jobForm.last_date} onChange={(e) => setJobForm({ ...jobForm, last_date: e.target.value })} />
                <button className="btn-primary sm:col-span-2" type="submit">Add Job</button>
              </form>
              <DataTable
                columns={["ID", "Company", "Role", "LPA", "Action"]}
                rows={jobs.map((j) => [
                  j.job_id,
                  companyNameMap[j.company_id] || j.company_id,
                  j.role,
                  j.salary_package,
                  <button className="btn-danger" onClick={() => remove(`/api/jobs/${j.job_id}`)}>Delete</button>,
                ])}
              />
            </section>
          )}

          {activeSection === "applications" && (
          <section id="applications" className="dashboard-card p-5">
            <PanelTitle title="Applications" subtitle="Pipeline and status management" />
            <form
              className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                submit(
                  "/api/applications",
                  {
                    ...applicationForm,
                    student_id: Number(applicationForm.student_id),
                    job_id: Number(applicationForm.job_id),
                  },
                  () => setApplicationForm(initialApplication)
                );
              }}
            >
              <select className="input" value={applicationForm.student_id} onChange={(e) => setApplicationForm({ ...applicationForm, student_id: e.target.value })} required>
                <option value="">Select Student</option>
                {students.map((s) => (
                  <option key={s.student_id} value={s.student_id}>{s.name}</option>
                ))}
              </select>
              <select className="input" value={applicationForm.job_id} onChange={(e) => setApplicationForm({ ...applicationForm, job_id: e.target.value })} required>
                <option value="">Select Job</option>
                {jobs.map((j) => (
                  <option key={j.job_id} value={j.job_id}>{j.role || `Job ${j.job_id}`}</option>
                ))}
              </select>
              <select className="input" value={applicationForm.status} onChange={(e) => setApplicationForm({ ...applicationForm, status: e.target.value })}>
                <option>Applied</option>
                <option>Under Review</option>
                <option>Selected</option>
                <option>Rejected</option>
              </select>
              <button className="btn-primary sm:col-span-2 xl:col-span-3" type="submit">Add Application</button>
            </form>
            <DataTable
              columns={["ID", "Student", "Job", "Status", "Actions"]}
              rows={applications.map((a) => [
                a.application_id,
                studentNameMap[a.student_id] || a.student_id,
                a.job_id,
                a.status,
                <div className="flex flex-wrap gap-2">
                  <button className="btn-warning" onClick={() => updateApplicationStatus(a.application_id, "Selected")}>Set Selected</button>
                  <button className="btn-danger" onClick={() => remove(`/api/applications/${a.application_id}`)}>Delete</button>
                </div>,
              ])}
            />
          </section>
          )}

          {activeSection === "admins" && (
          <section id="admins" className="dashboard-card p-5">
            <PanelTitle title="Admins" subtitle="Access management" />
            <form
              className="mt-4 grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit("/api/admins", adminForm, () => setAdminForm(initialAdmin));
              }}
            >
              <input className="input" placeholder="Username" value={adminForm.username} onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })} required />
              <input className="input" placeholder="Password" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} required />
              <button className="btn-primary sm:col-span-2" type="submit">Add Admin</button>
            </form>
            <DataTable
              columns={["ID", "Username", "Action"]}
              rows={admins.map((a) => [
                a.admin_id,
                a.username,
                <button className="btn-danger" onClick={() => remove(`/api/admins/${a.admin_id}`)}>Delete</button>,
              ])}
            />
          </section>
          )}
        </main>
      </div>
    </div>
  );
}

function PanelTitle({ title, subtitle }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h3 className="font-heading text-2xl">{title}</h3>
        <p className="text-sm text-slate-300/80">{subtitle}</p>
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-cyan-300/30 via-white/0 to-white/0" />
    </div>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/10">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 font-semibold uppercase tracking-[0.14em] text-cyan-100/90">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-4 text-slate-400" colSpan={columns.length}>
                No records
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="border-t border-white/10 bg-black/10 transition hover:bg-white/[0.03]">
                {row.map((cell, i) => (
                  <td key={i} className="px-3 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function WaveGraph({ data }) {
  const width = 760;
  const height = 250;
  const padX = 50;
  const padTop = 24;
  const padBottom = 44;
  const chartW = width - padX * 2;
  const chartH = height - padTop - padBottom;
  const maxValue = Math.max(1, ...data.map((d) => d.value));

  const points = data.map((d, i) => {
    const x = padX + (chartW * i) / Math.max(1, data.length - 1);
    const y = padTop + chartH - (d.value / maxValue) * chartH;
    return { ...d, x, y };
  });

  const linePath = points.reduce((acc, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const prev = points[index - 1];
    const cx = (prev.x + point.x) / 2;
    return `${acc} Q ${cx} ${prev.y} ${point.x} ${point.y}`;
  }, "");

  const areaPath = `${linePath} L ${padX + chartW} ${padTop + chartH} L ${padX} ${
    padTop + chartH
  } Z`;

  return (
    <article className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
        Components Wave Graph
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 w-full">
        <defs>
          <linearGradient id="waveArea" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.55)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0.05)" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = padTop + chartH * tick;
          return (
            <line
              key={tick}
              x1={padX}
              y1={y}
              x2={padX + chartW}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="5 5"
            />
          );
        })}

        <path d={areaPath} fill="url(#waveArea)" />
        <path
          d={linePath}
          fill="none"
          stroke="rgba(34,211,238,1)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="5" fill="rgba(16,185,129,1)" />
            <text
              x={point.x}
              y={point.y - 10}
              textAnchor="middle"
              fill="rgba(226,232,240,0.95)"
              fontSize="11"
            >
              {point.value}
            </text>
            <text
              x={point.x}
              y={padTop + chartH + 22}
              textAnchor="middle"
              fill="rgba(148,163,184,0.95)"
              fontSize="11"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </article>
  );
}

export default App;
