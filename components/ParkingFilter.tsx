"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ParkingFilter({ collegeId }: { collegeId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [maxCost, setMaxCost] = useState(searchParams.get("maxCost") || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (maxCost.trim()) {
      params.set("maxCost", maxCost.trim());
    } else {
      params.delete("maxCost");
    }
    router.push(`/colleges/${collegeId}?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <label className="text-sm text-gray-600">Max cost: $</label>
      <input
        type="number"
        value={maxCost}
        onChange={(e) => setMaxCost(e.target.value)}
        placeholder="e.g. 300"
        className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
      >
        Filter
      </button>
    </form>
  );
}
