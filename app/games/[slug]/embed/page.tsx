import React from "react";
import GameEmbedClient from "./GameEmbedClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function GameEmbedPage({ params }: PageProps) {
  const { slug } = await params;
  return <GameEmbedClient slug={slug} />;
}

export const dynamic = 'force-dynamic';
