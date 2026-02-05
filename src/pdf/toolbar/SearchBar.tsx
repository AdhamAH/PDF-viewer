import { useEffect, useState, useRef } from 'react';
import { useSearch } from '@embedpdf/plugin-search/react';
import { useScroll } from '@embedpdf/plugin-scroll/react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const scroll = useScroll(documentId);
  const state: SearchState = search?.state ?? {};
  const provides = search?.provides ?? {};

  const [query, setQuery] = useState(state.query ?? '');
  const prevActiveIndexRef = useRef<number | null>(null);

  // Sync external state to local state - intentionally excludes `query` from deps
  // to prevent infinite loops when setQuery is called
  useEffect(() => {
    const next = state.query ?? state.keyword;
    if (next !== undefined && next !== query) {
      setQuery(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.query, state.keyword]);

  // Scroll to page when active search result changes
  useEffect(() => {
    const activeIndex = state.activeResultIndex ?? state.activeMatchIndex ?? state.activeMatch;
    if (activeIndex === undefined || activeIndex === null) {
      prevActiveIndexRef.current = null;
      return;
    }

    // Only scroll when the index actually changes (not on initial mount with same value)
    if (prevActiveIndexRef.current === activeIndex) {
      return;
    }
    prevActiveIndexRef.current = activeIndex;

    // Get the matches array
    const matches = state.results ?? state.matches;
    if (!Array.isArray(matches) || matches.length === 0) {
      return;
    }

    // Get the current match
    const currentMatch = matches[activeIndex] as { pageIndex?: number; page?: number } | undefined;
    if (!currentMatch) {
      return;
    }

    // Get page index from the match (could be pageIndex or page depending on API version)
    const pageIndex = currentMatch.pageIndex ?? currentMatch.page;
    if (pageIndex === undefined || pageIndex === null) {
      return;
    }

    // Scroll to the page (scrollToPage uses 1-based page numbers)
    if (scroll?.provides?.scrollToPage) {
      scroll.provides.scrollToPage({ pageNumber: pageIndex + 1, behavior: 'smooth' });
    }
  }, [state.activeResultIndex, state.activeMatchIndex, state.activeMatch, state.results, state.matches, scroll?.provides]);

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
      <div className="search-input-wrapper">
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
        <button type="button" className="search-submit-btn" onClick={runSearch} data-tooltip="Search">
          <Search size={16} />
        </button>
      </div>
      <button type="button" className="toolbar-btn" onClick={goPrev} disabled={!totalMatches} data-tooltip="Previous">
        <ChevronLeft size={18} />
      </button>
      <button type="button" className="toolbar-btn" onClick={goNext} disabled={!totalMatches} data-tooltip="Next">
        <ChevronRight size={18} />
      </button>
      <span className="search-count">
        {totalMatches ? `${activeIndex}/${totalMatches}` : '0/0'}
      </span>
    </>
  );
}
