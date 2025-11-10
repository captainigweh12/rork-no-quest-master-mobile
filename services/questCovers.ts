import { storage } from '@/lib/storage';
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Quest } from '@/types';

export type QuestCoverMap = Record<string, string>; // questId -> data URL

async function generateCoverBase64(prompt: string): Promise<string> {
  const endpoint = 'https://toolkit.rork.com/images/generate/';
  const body = { prompt, size: '1024x1024' } as { prompt: string; size: string };
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Image gen failed: ${res.status}`);
  const json = await res.json() as { image: { base64Data: string; mimeType: string }, size: string };
  const mime = json.image.mimeType || 'image/png';
  return `data:${mime};base64,${json.image.base64Data}`;
}

export function useQuestCovers(quests: Quest[]) {
  const [covers, setCovers] = useState<QuestCoverMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
  const raw = await storage.getItem('questCovers');
        const parsed = raw ? JSON.parse(raw) as QuestCoverMap : {};
        setCovers(parsed);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'load error');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const getOrCreateCover = useCallback(async (quest: Quest) => {
    if (!quest?.id) return null;
    const existing = covers[quest.id];
    if (existing) return existing;
    try {
      const prompt = `Minimal, bold mobile cover for a quest titled "${quest.title}". Theme based on: ${quest.description || 'daily quest'}. Use strong lighting, high contrast, clean composition, no text, square.`;
      const dataUrl = await generateCoverBase64(prompt);
      const next = { ...covers, [quest.id]: dataUrl } as QuestCoverMap;
      setCovers(next);
  await storage.setItem('questCovers', JSON.stringify(next));
      return dataUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'gen error');
      return null;
    }
  }, [covers]);

  const getCoverForId = useCallback((questId: string | undefined | null) => {
    if (!questId) return null;
    return covers[questId] ?? null;
  }, [covers]);

  const completedNeedingCovers = useMemo(() => quests.filter(q => q.completed && !covers[q.id]), [quests, covers]);

  useEffect(() => {
    if (completedNeedingCovers.length === 0) return;
    // generate in background, sequentially to avoid rate limits
    (async () => {
      for (const q of completedNeedingCovers) {
        await getOrCreateCover(q);
      }
    })();
  }, [completedNeedingCovers, getOrCreateCover]);

  return { covers, isLoading, error, getOrCreateCover, getCoverForId };
}
