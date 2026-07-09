"use client";

import { useEffect } from "react";

export default function HtmlBackground({ color }: { color: string }) {
  useEffect(() => {
    const prev = document.documentElement.style.backgroundColor;
    document.documentElement.style.backgroundColor = color;
    return () => {
      document.documentElement.style.backgroundColor = prev;
    };
  }, [color]);

  return null;
}
