// search-helpers.ts
import {
  onSearchInput as baseOnSearchInput,
  handleEmptySearch,
  handleNoPrefix,
  handleUserSearch,
  updateUserResults,
  resetResultsOnError,
  handleChannelSearch,
  updateChannelResults,
} from './search-field.search';
import { UserService } from '../user.service';
import { ChannelService } from '../channel.service';

function getEmptySearchCallback(
  filteredResults: any[],
  noResultsFound: boolean
): () => void {
  return () => handleEmptySearch(filteredResults, { value: noResultsFound });
}

function getUserSearchCallback(
  userService: UserService,
  currentUser: any,
  filteredResults: any[],
  noResultsFound: boolean
): (q: string) => void {
  return (q: string) =>
    handleUserSearch(
      q,
      userService,
      currentUser,
      (users: any[]) =>
        updateUserResults(users, filteredResults, { value: noResultsFound }),
      () => resetResultsOnError(filteredResults, { value: noResultsFound })
    );
}

function getChannelSearchCallback(
  channelService: ChannelService,
  filteredResults: any[],
  noResultsFound: boolean
): (q: string) => void {
  return (q: string) =>
    handleChannelSearch(
      q,
      channelService,
      (channels: any[]) =>
        updateChannelResults(channels, filteredResults, {
          value: noResultsFound,
        }),
      () => resetResultsOnError(filteredResults, { value: noResultsFound })
    );
}

function getNoPrefixCallback(
  filteredResults: any[],
  noResultsFound: boolean
): () => void {
  return () => handleNoPrefix(filteredResults, { value: noResultsFound });
}

export function executeSearchInput(
  query: string,
  filteredResults: any[],
  noResultsFound: boolean,
  userService: UserService,
  currentUser: any,
  channelService: ChannelService
): void {
  baseOnSearchInput(
    query,
    getEmptySearchCallback(filteredResults, noResultsFound),
    getUserSearchCallback(
      userService,
      currentUser,
      filteredResults,
      noResultsFound
    ),
    getChannelSearchCallback(channelService, filteredResults, noResultsFound),
    getNoPrefixCallback(filteredResults, noResultsFound)
  );
}

export function performSearch(
  query: string,
  emptyCallback: () => void,
  userCallback: (q: string) => void,
  channelCallback: (q: string) => void,
  noPrefixCallback: () => void
): void {
  baseOnSearchInput(
    query,
    emptyCallback,
    userCallback,
    channelCallback,
    noPrefixCallback
  );
}

export function processEmptySearch(
  filteredResults: any[],
  noResultsFound: boolean
): void {
  handleEmptySearch(filteredResults, { value: noResultsFound });
}

export function processNoPrefix(
  filteredResults: any[],
  noResultsFound: boolean
): void {
  handleNoPrefix(filteredResults, { value: noResultsFound });
}

export function processUserSearch(
  query: string,
  userService: UserService,
  currentUser: any,
  updateCallback: (users: any[]) => void,
  errorCallback: () => void
): void {
  handleUserSearch(
    query,
    userService,
    currentUser,
    updateCallback,
    errorCallback
  );
}

export function processChannelSearch(
  query: string,
  channelService: ChannelService,
  updateCallback: (channels: any[]) => void,
  errorCallback: () => void
): void {
  handleChannelSearch(query, channelService, updateCallback, errorCallback);
}

export function updateUsers(
  users: any[],
  filteredResults: any[],
  noResultsFound: boolean
): void {
  updateUserResults(users, filteredResults, { value: noResultsFound });
}

export function updateChannels(
  channels: any[],
  filteredResults: any[],
  noResultsFound: boolean
): void {
  updateChannelResults(channels, filteredResults, { value: noResultsFound });
}

export function resetOnError(
  filteredResults: any[],
  noResultsFound: boolean
): void {
  resetResultsOnError(filteredResults, { value: noResultsFound });
}
