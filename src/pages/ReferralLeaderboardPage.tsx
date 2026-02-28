import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Users, MousePointerClick, TrendingUp } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  display_name_masked: string;
  signup_count: number;
  click_count: number;
  conversion_rate: number;
}

function useLeaderboard() {
  return useQuery({
    queryKey: ["referral-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_referral_leaderboard", {
        result_limit: 25,
      });
      if (error) throw error;
      return (data ?? []) as LeaderboardEntry[];
    },
    staleTime: 60_000,
  });
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-2xl">🥇</span>;
  if (rank === 2) return <span className="text-2xl">🥈</span>;
  if (rank === 3) return <span className="text-2xl">🥉</span>;
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
      {rank}
    </span>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export default function ReferralLeaderboardPage() {
  const { data: entries = [], isLoading, error } = useLeaderboard();

  const totalSignups = entries.reduce((s, e) => s + e.signup_count, 0);
  const totalClicks = entries.reduce((s, e) => s + e.click_count, 0);
  const avgConversion = entries.length
    ? (entries.reduce((s, e) => s + e.conversion_rate, 0) / entries.length).toFixed(1)
    : "0";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Trophy className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Referral Leaderboard
          </h1>
          <p className="mt-2 text-muted-foreground">
            Top community members driving adoption through referrals.
          </p>
        </div>

        {/* Summary stats */}
        <div className="mb-8 grid grid-cols-3 gap-3">
          <StatCard icon={Users} label="Referrers" value={entries.length} />
          <StatCard icon={MousePointerClick} label="Total Signups" value={totalSignups} />
          <StatCard icon={TrendingUp} label="Avg Conversion" value={`${avgConversion}%`} />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Loading leaderboard…
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-destructive">
              Failed to load leaderboard.
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="mb-3 h-10 w-10 opacity-40" />
              <p>No referrals yet. Be the first!</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 w-16">Rank</th>
                  <th className="px-4 py-3">Referrer</th>
                  <th className="px-4 py-3 text-right">Signups</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                  <th className="px-4 py-3 text-right">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.rank}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <RankBadge rank={entry.rank} />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {entry.display_name_masked}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">
                      {entry.signup_count}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                      {entry.click_count}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                      {entry.conversion_rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
