import { scoreUserKey, type PinballScoreRow } from "@/lib/pinball/leaderboard";

const dateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium",
});

export function PinballScoreList({ scores, deviceId, label, ranked = false }: {
  scores: PinballScoreRow[];
  deviceId: string | null;
  label: string;
  ranked?: boolean;
}) {
  return (
    <ol className="pb-ranks" aria-label={label} data-ranked={ranked}>
      {scores.map((row, index) => {
        const self = !!deviceId && row.deviceId === deviceId;
        return (
          <li key={`${row.deviceId ?? scoreUserKey(row.username)}-${row.playedAt}-${row.score}-${index}`} data-self={self}>
            {ranked && <span className="pb-place" aria-label={`Rank ${index + 1}`}>{index + 1}</span>}
            <div className="pb-scorePlayer"><span className="pb-scoreName" title={row.username}>{row.username}</span>
              {ranked && self && <span className="pb-selfTag">Rank Check</span>}
            </div>
            <strong>{row.score.toLocaleString()}</strong>
            <time dateTime={row.playedAt}>{dateTime.format(new Date(row.playedAt))}</time>
          </li>
        );
      })}
    </ol>
  );
}
