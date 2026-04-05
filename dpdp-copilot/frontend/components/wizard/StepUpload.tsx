"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import type { AnalyzeRequestBody, CompanyDetails } from "@/lib/api";

interface StepUploadProps {
  onSubmit: (data: AnalyzeRequestBody) => void;
  isLoading: boolean;
  initialInputs?: AnalyzeRequestBody | null;
  isHistoryView?: boolean;
}

export default function StepUpload({ onSubmit, isLoading, initialInputs, isHistoryView }: StepUploadProps) {
  const [productDesc, setProductDesc] = useState(initialInputs?.product_description || "");
  const [schemaText, setSchemaText] = useState(initialInputs?.schema_text || "");
  const [policyText, setPolicyText] = useState(initialInputs?.privacy_policy_text || "");
  const [company, setCompany] = useState<CompanyDetails>(
    initialInputs?.company_details || {
      name: "",
      contact_email: "",
      dpo_name: "",
      grievance_email: "",
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialInputs) {
      setProductDesc(initialInputs.product_description);
      setSchemaText(initialInputs.schema_text);
      setPolicyText(initialInputs.privacy_policy_text || "");
      setCompany(initialInputs.company_details);
    } else {
      setProductDesc("");
      setSchemaText("");
      setPolicyText("");
      setCompany({ name: "", contact_email: "", dpo_name: "", grievance_email: "" });
    }
  }, [initialInputs]);

  const onSchemaDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors((e) => ({ ...e, schema: "File too large. Max 5MB." }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSchemaText(reader.result as string);
      setErrors((e) => ({ ...e, schema: "" }));
    };
    reader.readAsText(file);
  }, []);

  const {
    getRootProps: getSchemaRootProps,
    getInputProps: getSchemaInputProps,
    isDragActive: isSchemaDragActive,
  } = useDropzone({
    onDrop: onSchemaDrop,
    accept: { "application/json": [".json"], "text/plain": [".txt"] },
    maxFiles: 1,
  });

  const onPolicyDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors((e) => ({ ...e, policy: "File too large. Max 5MB." }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPolicyText(reader.result as string);
      setErrors((e) => ({ ...e, policy: "" }));
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps: getPolicyRootProps, getInputProps: getPolicyInputProps } =
    useDropzone({
      onDrop: onPolicyDrop,
      accept: { "text/plain": [".txt"], "application/pdf": [".pdf"] },
      maxFiles: 1,
    });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (productDesc.trim().split(/\s+/).length < 5) {
      newErrors.productDesc = "At least 5 words required";
    }
    if (schemaText.trim().length < 5) {
      newErrors.schema = "Schema is required";
    }
    if (!company.name.trim()) {
      newErrors.companyName = "Company name is required";
    }
    if (!company.contact_email.match(/^[\w.\-+]+@[\w.\-]+\.\w+$/)) {
      newErrors.email = "Valid email required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onSubmit({
      product_description: productDesc.trim(),
      schema_text: schemaText.trim(),
      privacy_policy_text: policyText.trim() || undefined,
      company_details: {
        name: company.name.trim(),
        contact_email: company.contact_email.trim(),
        dpo_name: company.dpo_name?.trim() || undefined,
        grievance_email: company.grievance_email?.trim() || undefined,
      },
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Step 1: Upload Your Data</h2>

      <div>
        <label className="block text-sm font-medium mb-1 flex justify-between">
          <span>Product Description <span className="text-red-500">*</span></span>
          {isHistoryView && <span className="text-xs text-teal-600 dark:text-teal-400 font-semibold bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded">Locked (History Mode)</span>}
        </label>
        <textarea
          value={productDesc}
          onChange={(e) => setProductDesc(e.target.value)}
          disabled={isHistoryView}
          placeholder="Describe your product, what data it collects, and how it processes user information..."
          className={`w-full border rounded-lg p-3 h-28 text-sm transition-colors ${isHistoryView ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed" : "border-gray-300 dark:border-gray-700 dark:bg-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent"}`}
        />
        {errors.productDesc && (
          <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.productDesc}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 flex justify-between">
          <span>Data Schema <span className="text-red-500">*</span></span>
          {isHistoryView && <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">Editable</span>}
        </label>
        <div
          {...getSchemaRootProps()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            isSchemaDragActive
              ? "border-teal-400 bg-teal-50 dark:bg-teal-900/20"
              : "border-gray-300 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-600"
          }`}
        >
          <input {...getSchemaInputProps()} />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Drop a JSON file here, or click to upload
          </p>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Or paste your schema below:</p>
        <textarea
          value={schemaText}
          onChange={(e) => setSchemaText(e.target.value)}
          placeholder='{"users": ["name", "email", "phone"], "payments": ["credit_card", "upi_id"]}'
          className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-900 rounded-lg p-3 h-24 text-sm mt-1 font-mono focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
        />
        {errors.schema && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.schema}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 flex justify-between">
          <span>Existing Privacy Policy <span className="text-gray-400">(optional)</span></span>
          {isHistoryView && <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">Editable to Patch Gaps</span>}
        </label>
        {isHistoryView && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            You can update your privacy policy text below to patch identified gaps. Re-analyzing will create a new version of this analysis.
          </p>
        )}
        <div
          {...getPolicyRootProps()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:border-teal-300 dark:hover:border-teal-600 transition-colors"
        >
          <input {...getPolicyInputProps()} />
          <p className="text-sm text-gray-500 dark:text-gray-400">Drop a TXT/PDF file, or click to upload</p>
        </div>
        <textarea
          value={policyText}
          onChange={(e) => setPolicyText(e.target.value)}
          placeholder="Paste your existing privacy policy text here (or leave empty)..."
          className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-900 rounded-lg p-3 h-20 text-sm mt-1 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
        />
        {errors.policy && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.policy}</p>}
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3 transition-colors">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Company Details</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              value={company.name}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
              disabled={isHistoryView}
              className={`w-full border rounded-lg px-3 py-2 text-sm transition-colors ${isHistoryView ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed" : "border-gray-300 dark:border-gray-700 dark:bg-gray-900"}`}
              placeholder="Your Company Pvt Ltd"
            />
            {errors.companyName && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.companyName}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Contact Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={company.contact_email}
              onChange={(e) => setCompany({ ...company, contact_email: e.target.value })}
              disabled={isHistoryView}
              className={`w-full border rounded-lg px-3 py-2 text-sm transition-colors ${isHistoryView ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed" : "border-gray-300 dark:border-gray-700 dark:bg-gray-900"}`}
              placeholder="privacy@company.in"
            />
            {errors.email && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              DPO Name <span className="text-gray-400 dark:text-gray-500">(optional)</span>
            </label>
            <input
              value={company.dpo_name || ""}
              onChange={(e) => setCompany({ ...company, dpo_name: e.target.value })}
              disabled={isHistoryView}
              className={`w-full border rounded-lg px-3 py-2 text-sm transition-colors ${isHistoryView ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed" : "border-gray-300 dark:border-gray-700 dark:bg-gray-900"}`}
              placeholder="Data Protection Officer"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Grievance Email <span className="text-gray-400 dark:text-gray-500">(optional)</span>
            </label>
            <input
              type="email"
              value={company.grievance_email || ""}
              onChange={(e) =>
                setCompany({ ...company, grievance_email: e.target.value })
              }
              disabled={isHistoryView}
              className={`w-full border rounded-lg px-3 py-2 text-sm transition-colors ${isHistoryView ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed" : "border-gray-300 dark:border-gray-700 dark:bg-gray-900"}`}
              placeholder="grievance@company.in"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
      >
        {isLoading ? "Analyzing..." : "Analyze Compliance ->"}
      </button>
    </div>
  );
}
