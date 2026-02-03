import { useEffect, useState } from 'react';
import { useSearch } from '@embedpdf/plugin-search/react';
import type { SearchCapability, SearchState } from '../types';

type SearchBarProps = {
  documentId: string;
};

function getTotalMatches(state: SearchState): number {
  if (typeof state.totalResults === 'number') {
    return state.totalResults;
  }
  if (typeof state.totalMatches === 'number') {
    return state.totalMatches;
  }
  if (typeof state.matchCount === 'number') {
    return state.matchCount;
  }
  const list = state.results ?? state.matches;
  if (Array.isArray(list)) {
    return list.length;
  }
  return 0;
}

function getActiveIndex(state: SearchState, totalMatches: number): number {
  if (typeof state.activeResultIndex === 'number') {
    return state.activeResultIndex + 1;
  }
  if (typeof state.activeMatchIndex === 'number') {
    return state.activeMatchIndex + 1;
  }
  if (typeof state.activeMatch === 'number') {
    return state.activeMatch + 1;
  }
  return totalMatches > 0 ? 1 : 0;
}

export default function SearchBar({ documentId }: SearchBarProps) {
  // Type assertion through unknown to handle varying library API shapes
  const search = useSearch(documentId) as unknown as SearchCapability | undefined;
  const state: SearchState = search?.state ?? {};
  const provides = search?.provides ?? {};

  const [query, setQuery] = useState(state.query ?? '');

  // Sync external state to local state - intentionally excludes `query` from deps
  // to prevent infinite loops when setQuery is called
  useEffect(() => {
    const next = state.query ?? state.keyword;
    if (next !== undefined && next !== query) {
      setQuery(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.query, state.keyword]);

  // Compute derived values - React 19 compiler handles memoization
  const totalMatches = getTotalMatches(state);
  const activeIndex = getActiveIndex(state, totalMatches);

  const runSearch = () => {
    if (provides.searchAllPages) {
      provides.searchAllPages(query);
      return;
    }
    if (provides.search) {
      provides.search(query);
      return;
    }
    if (provides.requestSearch) {
      provides.requestSearch(query);
      return;
    }
    if (provides.setSearchQuery) {
      provides.setSearchQuery(query);
      return;
    }
    if (provides.setSearchTerm) {
      provides.setSearchTerm(query);
      return;
    }
    if (provides.startSearch) {
      provides.startSearch();
    }
  };

  const goNext = () => {
    if (provides.nextResult) {
      provides.nextResult();
      return;
    }
    if (provides.nextMatch) {
      provides.nextMatch();
      return;
    }
    if (provides.goToNextMatch) {
      provides.goToNextMatch();
      return;
    }
    if (provides.goToNextResult) {
      provides.goToNextResult();
    }
  };

  const goPrev = () => {
    if (provides.previousResult) {
      provides.previousResult();
      return;
    }
    if (provides.previousMatch) {
      provides.previousMatch();
      return;
    }
    if (provides.prevMatch) {
      provides.prevMatch();
      return;
    }
    if (provides.goToPreviousMatch) {
      provides.goToPreviousMatch();
      return;
    }
    if (provides.goToPreviousResult) {
      provides.goToPreviousResult();
    }
  };

  return (
    <>
      <input
        type="text"
        value={query}
        placeholder="Find text"
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            runSearch();
          }
        }}
      />
      <button type="button" onClick={runSearch}>
        Search
      </button>
      <button type="button" onClick={goPrev} disabled={!totalMatches}>
        Prev
      </button>
      <button type="button" onClick={goNext} disabled={!totalMatches}>
        Next
      </button>
      <span>
        {totalMatches ? `${activeIndex}/${totalMatches}` : '0/0'}
      </span>
    </>
  );
}
