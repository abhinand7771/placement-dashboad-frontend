import { useEffect, useMemo, useState } from "react";


const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend-3-f4wk.onrender.com";

const initialStudents = { name: "", email: "", phone: "", branch: "", cgpa: "", graduation_year: "" };
const initialCompany = { company_name: "", location: "", min_cgpa: "" };
const initialJob = { company_id: "", role: "", salary_package: "", last_date: "" };
const initialApplication = { student_id: "", job_id: "", status: "Applied" };
const initialAdmin = { username: "", password: "" };

const navItems = [
  { key: "dashboard", label: "Dashboard" },
  { key: "students", label: "Students" },
  { key: "applications", label: "Applications" },
  { key: "jobs", label: "Jobs" },
  { key: "admins", label: "Admins" },
];

function makeWavePath(points) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const midX = (points[i - 1].x + points[i].x) / 2;
    const midY = (points[i - 1].y + points[i].y) / 2;
    path += ` Q ${points[i - 1].x} ${points[i - 1].y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  path += ` T ${last.x} ${last.y}`;
  return path;
}

function App() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [health, setHealth] = useState(null);
  const [profileViews, setProfileViews] = useState(0);
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

  const statusCounts = useMemo(
    () =>
      applications.reduce(
        (acc, item) => {
          const next = { ...acc };
          if (item.status === "Selected") next.selected += 1;
          if (item.status === "Applied" || item.status === "Under Review") next.active += 1;
          if (item.status === "Rejected") next.rejected += 1;
          return next;
        },
        { selected: 0, active: 0, rejected: 0 }
      ),
    [applications]
  );

  const studentsTrend = useMemo(() => {
    const byYear = students.reduce((acc, s) => {
      const year = Number(s.graduation_year) || 0;
      const key = year ? String(year) : "Unknown";
      const next = { ...acc };
      next[key] = (next[key] || 0) + 1;
      return next;
    }, {});
    const data = Object.entries(byYear)
      .sort(([a], [b]) => {
        if (a === "Unknown") return 1;
        if (b === "Unknown") return -1;
        return Number(a) - Number(b);
      })
      .map(([label, value]) => ({ label, value: Number(value) }));
    return data.length ? data : [{ label: "N/A", value: 0 }];
  }, [students]);

  const interviewsTrend = useMemo(
    () =>
      studentsTrend.map((d, i) => ({
        label: d.label,
        value: Math.max(0, Math.round(d.value * 0.6 + Math.sin(i + 1) * 2)),
      })),
    [studentsTrend]
  );

  const avgCgpa = useMemo(() => {
    const nums = students.map((s) => Number(s.cgpa)).filter((v) => Number.isFinite(v));
    if (!nums.length) return "0.00";
    return (nums.reduce((sum, n) => sum + n, 0) / nums.length).toFixed(2);
  }, [students]);

  const api = async (path, options = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) throw new Error(data?.message || `Request failed: ${path}`);
    return data;
  };

  const loadAll = async () => {
    setBusy(true);
    setError("");
    try {
      const [h, s, c, j, a, ad, pv] = await Promise.all([
        api("/health"),
        api("/api/students"),
        api("/api/companies"),
        api("/api/jobs"),
        api("/api/applications"),
        api("/api/admins"),
        api("/api/profile-views/summary"),
      ]);
      setHealth(h);
      setStudents(s.data || []);
      setCompanies(c.data || []);
      setJobs(j.data || []);
      setApplications(a.data || []);
      setAdmins(ad.data || []);
      setProfileViews(Number(pv.total_views) || 0);
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setBusy(false);
    }
  };

  const trackProfileView = async () => {
    try {
      await api("/api/profile-views", {
        method: "POST",
        body: JSON.stringify({ viewed_by: "dashboard" }),
      });
    } catch (_err) {
      // Do not block dashboard load if tracking fails.
    }
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      await trackProfileView();
      await loadAll();
    };
    initializeDashboard();
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
    <div className="dashboard-root">
      <div className="dashboard-wrap">
        <aside className="left-rail">
          <div className="brand-box">
            <div className="brand-logo">J</div>
            <div>
              <p className="brand-name">Ruke</p>
              <p className="brand-sub">Placement Suite</p>
            </div>
          </div>
          <nav className="menu">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`menu-btn ${activeNav === item.key ? "active" : ""}`}
                onClick={() => setActiveNav(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <button type="button" className="rail-refresh" onClick={loadAll} disabled={busy}>
            {busy ? "Syncing..." : "Refresh Data"}
          </button>
        </aside>

        <main className="main-area">
          <header className="topbar">
            <h1>Dashboard</h1>
            <div className="topbar-actions">
              <span className="status-dot">{health?.ok ? "Live" : "Down"}</span>
            </div>
          </header>

          {error && <div className="error-banner">{error}</div>}

          <section className="kpi-grid">
            <KpiCard title="Students Registered" value={students.length} color="violet" />
            <KpiCard title="Applications Sent" value={applications.length} color="blue" />
            <KpiCard title="Profile Views" value={profileViews} color="green" />
            <KpiCard title="Unread Messages" value={admins.length + companies.length} color="lime" />
          </section>

          <section className="analytics-grid">
            <ProfileCard
              students={students.length}
              selected={statusCounts.selected}
              avgCgpa={avgCgpa}
            />
            <WaveAnalyticsChart primary={studentsTrend} secondary={interviewsTrend} />
          </section>

          {(activeNav === "students" || activeNav === "dashboard") && (
            <section className="panel-card">
              <h2>Students</h2>
              <StudentForm form={studentForm} setForm={setStudentForm} submit={submit} />
              <DataTable
                columns={["ID", "Name", "Branch", "CGPA", "Action"]}
                rows={students.map((s) => [
                  s.student_id,
                  s.name,
                  s.branch || "-",
                  s.cgpa || "-",
                  <button type="button" className="btn-danger" onClick={() => remove(`/api/students/${s.student_id}`)}>Delete</button>,
                ])}
              />
            </section>
          )}

          {(activeNav === "applications" || activeNav === "dashboard") && (
            <section className="panel-card">
              <h2>Applications</h2>
              <ApplicationForm
                form={applicationForm}
                setForm={setApplicationForm}
                students={students}
                jobs={jobs}
                submit={submit}
              />
              <DataTable
                columns={["ID", "Student", "Job", "Status", "Actions"]}
                rows={applications.map((a) => [
                  a.application_id,
                  studentNameMap[a.student_id] || a.student_id,
                  a.job_id,
                  a.status,
                  <div className="action-row">
                    <button type="button" className="btn-warning" onClick={() => updateApplicationStatus(a.application_id, "Selected")}>Select</button>
                    <button type="button" className="btn-danger" onClick={() => remove(`/api/applications/${a.application_id}`)}>Delete</button>
                  </div>,
                ])}
              />
            </section>
          )}

          {(activeNav === "jobs" || activeNav === "dashboard") && (
            <section className="panel-card two-col">
              <div>
                <h2>Companies</h2>
                <CompanyForm form={companyForm} setForm={setCompanyForm} submit={submit} />
                <DataTable
                  columns={["ID", "Company", "Location", "Action"]}
                  rows={companies.map((c) => [
                    c.company_id,
                    c.company_name,
                    c.location || "-",
                    <button type="button" className="btn-danger" onClick={() => remove(`/api/companies/${c.company_id}`)}>Delete</button>,
                  ])}
                />
              </div>
              <div>
                <h2>Jobs</h2>
                <JobForm form={jobForm} setForm={setJobForm} companies={companies} submit={submit} />
                <DataTable
                  columns={["ID", "Company", "Role", "LPA", "Action"]}
                  rows={jobs.map((j) => [
                    j.job_id,
                    companyNameMap[j.company_id] || j.company_id,
                    j.role || "-",
                    j.salary_package || "-",
                    <button type="button" className="btn-danger" onClick={() => remove(`/api/jobs/${j.job_id}`)}>Delete</button>,
                  ])}
                />
              </div>
            </section>
          )}

          {(activeNav === "admins" || activeNav === "dashboard") && (
            <section className="panel-card">
              <h2>Admins</h2>
              <AdminForm form={adminForm} setForm={setAdminForm} submit={submit} />
              <DataTable
                columns={["ID", "Username", "Action"]}
                rows={admins.map((a) => [
                  a.admin_id,
                  a.username,
                  <button type="button" className="btn-danger" onClick={() => remove(`/api/admins/${a.admin_id}`)}>Delete</button>,
                ])}
              />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function KpiCard({ title, value, color }) {
  return (
    <article className={`kpi-card ${color}`}>
      <p>{title}</p>
      <h3>{value}</h3>
    </article>
  );
}

function ProfileCard({ students, selected, avgCgpa }) {
  const metrics = [
    { label: "Selected", value: selected },
    { label: "Students", value: students },
    { label: "Avg CGPA", value: avgCgpa },
  ];
  return (
    <article className="profile-card">
      <div className="avatar-ring">
        <div className="avatar-core">PM</div>
      </div>
      <h3>Placement Monitor</h3>
      <div className="mini-metrics">
        {metrics.map((m) => (
          <div key={m.label} className="mini-pill">
            <span>{m.label}</span>
            <strong>{m.value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function WaveAnalyticsChart({ primary, secondary }) {
  const width = 900;
  const height = 320;
  const pad = 28;
  const baseY = height - pad;
  const maxVal = Math.max(...primary.map((d) => d.value), ...secondary.map((d) => d.value), 1);

  const toPoints = (series) =>
    series.map((d, i) => {
      const step = series.length > 1 ? (width - pad * 2) / (series.length - 1) : 0;
      return {
        ...d,
        x: pad + i * step,
        y: baseY - (d.value / maxVal) * (height - pad * 2),
      };
    });

  const p1 = toPoints(primary);
  const p2 = toPoints(secondary);
  const line1 = makeWavePath(p1);
  const line2 = makeWavePath(p2);
  const area = p1.length ? `${line1} L ${p1[p1.length - 1].x} ${baseY} L ${p1[0].x} ${baseY} Z` : "";

  return (
    <article className="wave-card">
      <div className="wave-header">
        <h3>Vacancy Stats</h3>
        <div className="legend">
          <span><i className="dot blue" />Students</span>
          <span><i className="dot purple" />Interviews</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="wave-svg">
        <defs>
          <linearGradient id="fillBlue" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="strokeBlue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4338ca" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="strokePurple" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((n) => {
          const y = pad + ((height - pad * 2) / 4) * n;
          return <line key={n} x1={pad} x2={width - pad} y1={y} y2={y} stroke="#e2e8f055" />;
        })}
        <path d={area} fill="url(#fillBlue)" />
        <path d={line2} fill="none" stroke="url(#strokePurple)" strokeWidth="3.5" strokeDasharray="9 9" />
        <path d={line1} fill="none" stroke="url(#strokeBlue)" strokeWidth="5" className="wave-anim" />
      </svg>
      <div className="wave-label-row">
        {p1.map((p) => (
          <span key={p.label}>
            {p.label}: <strong>{p.value}</strong>
          </span>
        ))}
      </div>
    </article>
  );
}

function StudentForm({ form, setForm, submit }) {
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        submit(
          "/api/students",
          {
            ...form,
            cgpa: form.cgpa ? Number(form.cgpa) : null,
            graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
          },
          () => setForm(initialStudents)
        );
      }}
    >
      <input className="input" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <input className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <input className="input" placeholder="Branch" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
      <input className="input" placeholder="CGPA" type="number" step="0.01" value={form.cgpa} onChange={(e) => setForm({ ...form, cgpa: e.target.value })} />
      <input className="input" placeholder="Graduation Year" type="number" value={form.graduation_year} onChange={(e) => setForm({ ...form, graduation_year: e.target.value })} />
      <button className="btn-primary form-btn" type="submit">Add Student</button>
    </form>
  );
}

function CompanyForm({ form, setForm, submit }) {
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        submit("/api/companies", form, () => setForm(initialCompany));
      }}
    >
      <input className="input" placeholder="Company Name *" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required />
      <input className="input" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      <input className="input col-span-2" placeholder="Min CGPA" type="number" step="0.01" value={form.min_cgpa} onChange={(e) => setForm({ ...form, min_cgpa: e.target.value })} />
      <button className="btn-primary form-btn" type="submit">Add Company</button>
    </form>
  );
}

function JobForm({ form, setForm, companies, submit }) {
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        submit("/api/jobs", { ...form, company_id: Number(form.company_id) }, () => setForm(initialJob));
      }}
    >
      <select className="input" value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })} required>
        <option value="">Select Company</option>
        {companies.map((c) => (
          <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
        ))}
      </select>
      <input className="input" placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
      <input className="input" placeholder="Salary Package" type="number" step="0.01" value={form.salary_package} onChange={(e) => setForm({ ...form, salary_package: e.target.value })} />
      <input className="input" type="date" value={form.last_date} onChange={(e) => setForm({ ...form, last_date: e.target.value })} />
      <button className="btn-primary form-btn" type="submit">Add Job</button>
    </form>
  );
}

function ApplicationForm({ form, setForm, students, jobs, submit }) {
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        submit(
          "/api/applications",
          { ...form, student_id: Number(form.student_id), job_id: Number(form.job_id) },
          () => setForm(initialApplication)
        );
      }}
    >
      <select className="input" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} required>
        <option value="">Select Student</option>
        {students.map((s) => (
          <option key={s.student_id} value={s.student_id}>{s.name}</option>
        ))}
      </select>
      <select className="input" value={form.job_id} onChange={(e) => setForm({ ...form, job_id: e.target.value })} required>
        <option value="">Select Job</option>
        {jobs.map((j) => (
          <option key={j.job_id} value={j.job_id}>{j.role || `Job ${j.job_id}`}</option>
        ))}
      </select>
      <select className="input col-span-2" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
        <option>Applied</option>
        <option>Under Review</option>
        <option>Selected</option>
        <option>Rejected</option>
      </select>
      <button className="btn-primary form-btn" type="submit">Add Application</button>
    </form>
  );
}

function AdminForm({ form, setForm, submit }) {
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        submit("/api/admins", form, () => setForm(initialAdmin));
      }}
    >
      <input className="input" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
      <input className="input" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
      <button className="btn-primary form-btn" type="submit">Add Admin</button>
    </form>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>No records</td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, i) => (
                  <td key={i}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;
