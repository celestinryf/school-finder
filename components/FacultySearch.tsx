"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function FacultySearch({ collegeId }: { collegeId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prefix, setPrefix] = useState(
    searchParams.get("lastNamePrefix") || ""
  );
  const [deptId, setDeptId] = useState(
    searchParams.get("departmentId") || ""
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (prefix.trim()) {
      params.set("lastNamePrefix", prefix.trim());
    } else {
      params.delete("lastNamePrefix");
    }
    if (deptId.trim()) {
      params.set("departmentId", deptId.trim());
    } else {
      params.delete("departmentId");
    }
    router.push(`/colleges/${collegeId}?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={prefix}
        onChange={(e) => setPrefix(e.target.value)}
        placeholder="Last name starts with..."
        className="w-48 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
      />
      <input
        type="number"
        value={deptId}
        onChange={(e) => setDeptId(e.target.value)}
        placeholder="Dept ID"
        className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
      >
        Search
      </button>
    </form>
  );
}
