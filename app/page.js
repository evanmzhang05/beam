"use client";

import { useState } from "react";

export default function Home() {
  const [form, setForm] = useState({
    email: "",
    keywords: "",
    experienceLevel: "",
    companies: "",
  });
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setStatus("error");
        setMessage(data.error || "Something went wrong.");
        return;
      }
      setStatus("success");
      setMessage(
        `Success! We found ${data.count} matching jobs and sent them to ${form.email}. You'll get a new digest every day at 10am.`
      );
    } catch (err) {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <main style={{ maxWidth: 480, margin: "60px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Job Bot</h1>
      <p style={{ color: "#555", fontSize: 14, marginBottom: 28 }}>
        Set your search once. Get a fresh digest of matching jobs every morning at 10am.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label style={labelStyle}>
          Email
          <input
            type="email"
            name="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Keywords (comma-separated)
          <input
            type="text"
            name="keywords"
            required
            value={form.keywords}
            onChange={handleChange}
            placeholder="e.g. investment banking, financial analyst, equity research"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Experience level
          <input
            type="text"
            name="experienceLevel"
            required
            value={form.experienceLevel}
            onChange={handleChange}
            placeholder="e.g. analyst, associate"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Target companies (comma-separated, optional)
          <input
            type="text"
            name="companies"
            value={form.companies}
            onChange={handleChange}
            placeholder="e.g. Stripe, Coinbase, Robinhood"
            style={inputStyle}
          />
        </label>

        <button type="submit" disabled={status === "loading"} style={buttonStyle}>
          {status === "loading" ? "Setting up..." : "Start my job search"}
        </button>
      </form>

      {message && (
        <p style={{ marginTop: 20, fontSize: 14, color: status === "error" ? "#b91c1c" : "#15803d" }}>
          {message}
        </p>
      )}
    </main>
  );
}

const labelStyle = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#333" };
const inputStyle = { padding: "10px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14 };
const buttonStyle = {
  padding: "10px 16px",
  borderRadius: 6,
  border: "none",
  background: "#111",
  color: "#fff",
  fontSize: 14,
  cursor: "pointer",
  marginTop: 8,
};
