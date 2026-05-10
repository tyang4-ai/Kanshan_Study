'use client';

import { Corkboard } from './Corkboard';

interface RailContentProps {
  width: number;
  searchOpen: boolean;
  postitOpen: boolean;
  onCloseSearch: () => void;
  onClosePostit: () => void;
}

// Width-responsive corkboard. Pins persist via useCorkboardStore. The
// previous hard-coded JSX (BulletinTrendCard / RelCard / sticky note) has been
// replaced — it was decorative and the search/add buttons did nothing. Pins now
// come from user drags + 看山 dispatch + manual post-its.
export function RailContent({
  width,
  searchOpen,
  postitOpen,
  onCloseSearch,
  onClosePostit,
}: RailContentProps) {
  return (
    <Corkboard
      width={width}
      // height (used for movePin clamps) is the corkboard's painted area;
      // approximate with a generous default — overflow is handled by the
      // container's vertical-scroll mode past N=12.
      height={2000}
      searchOpen={searchOpen}
      postitOpen={postitOpen}
      onCloseSearch={onCloseSearch}
      onClosePostit={onClosePostit}
    />
  );
}
