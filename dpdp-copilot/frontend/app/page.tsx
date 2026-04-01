"use client";

import { useRouter } from "next/navigation";

const DEMO_SCENARIOS = [
  {
    id: "ecommerce",
    title: "E-Commerce (ShopEasy)",
    description: "Financial + behavioral data: UPI, credit cards, browsing history",
    emoji: "🛒",
    risk: "high",
  },
  {
    id: "edtech",
    title: "EdTech (LearnBharat)",
    description: "Children's data: student profiles, grades, learning behavior",
    emoji: "📚",
    risk: "critical",
  },
  {
    id: "healthtech",
    title: "HealthTech (MedConnect)",
    description: "Health + biometric: medical records, Aadhaar, fingerprint",
    emoji: "🏥",
    risk: "critical",
  },
];

const FEATURES = [
  {
    title: "Classify Your Data",
    description:
      "Upload your schema - AI classifies each field into DPDP categories (identifiers, financial, health, children, sensitive).",
    icon: "🔍",
  },
  {
    title: "Gap Analysis Report",
    description:
      "Get a detailed gap report comparing your privacy policy against DPDP Act 2023 obligations with section references.",
    icon: "📊",
  },
  {
    title: "Generate Documents",
    description:
      "Download ready-to-use privacy notices, consent texts, retention matrices, and breach SOPs citing DPDP sections.",
    icon: "📄",
  },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div>
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-teal-900 text-white px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Is your SaaS <span className="text-teal-400">DPDP-ready</span>?
          </h1>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
            Upload your product schema and privacy policy. Get a compliance gap
            report plus ready-to-use legal documents in under 3 minutes.
          </p>
          <p className="mt-2 text-sm text-gray-400">
            Deadline: May 13, 2027 - Penalties up to INR 250 crore per violation
          </p>
          <button
            onClick={() => router.push("/analyze")}
            className="mt-8 px-8 py-3 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-lg transition-colors text-lg"
          >
            Start Analysis →
          </button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-100 px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-3">Try a Demo</h2>
          <p className="text-center text-gray-600 mb-10">
            See instant results - no sign-up, no API key needed
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {DEMO_SCENARIOS.map((demo) => (
              <button
                key={demo.id}
                onClick={() => router.push(`/analyze?demo=${demo.id}`)}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-teal-300 hover:shadow-md transition-all text-left"
              >
                <div className="text-3xl mb-3">{demo.emoji}</div>
                <h3 className="font-semibold text-lg mb-1">{demo.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{demo.description}</p>
                <span className="inline-block px-2 py-1 bg-red-50 text-red-700 text-xs font-medium rounded">
                  Risk: {demo.risk.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
