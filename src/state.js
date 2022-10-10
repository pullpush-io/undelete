import React from 'react'
import { Subscribe, Container } from 'unstated'
import { get, put } from './utils'
import { chunkSize } from './api/pushshift'

// Sort types for comments
export const sort = {
  top: 'SORT_TOP',
  bottom: 'SORT_BOTTOM',
  new: 'SORT_NEW',
  old: 'SORT_OLD'
}

// Filter types for comments
export const filter = {
  all: 'SHOW_ALL',
  removedDeleted: 'SHOW_REMOVED_DELETED',
  removed: 'SHOW_REMOVED',
  deleted: 'SHOW_DELETED'
}

// Light/Dark mode themes
export const theme = {
  dark: 'DARK',
  light: 'LIGHT',
  system: 'SYSTEM'
}

export const maxCommentsDefault = chunkSize * 4
export const minCommentsLimit   = chunkSize
export const maxCommentsLimit   = 20000

// Constrains input to between minCommentsLimit and maxCommentsLimit
export const constrainMaxComments = maxComments => {
  maxComments = Math.min(Math.round(maxComments), maxCommentsLimit)
  if (!(maxComments >= minCommentsLimit))  // also true when maxComments isn't a number
    maxComments = minCommentsLimit
  return maxComments
}

// Keys for localStorage
const sortKey = 'commentSort'
const filterKey = 'commentFilter'
const maxCommentsKey = 'maxComments'
const themeKey = 'theme'

document.documentElement.dataset.theme = get(themeKey, theme.dark)
setTimeout(() => document.documentElement.style.transitionDuration = '0.4s')

class GlobalState extends Container {
  state = {
    commentSort: get(sortKey, sort.top),
    commentFilter: get(filterKey, filter.removedDeleted),
    loadingMoreComments: 0,  // max # of comments to attempt to load next
    statusText: '',
    statusHelpUrl: undefined,
    statusImage: undefined
  }

  // Preferred max # of comments to get during (re-)loads
  maxComments = get(maxCommentsKey, maxCommentsDefault)

  curTheme = document.documentElement.dataset.theme

  setCommentSort (sortType) {
    put(sortKey, sortType)
    this.setState({commentSort: sortType})
  }

  setCommentFilter (filterType) {
    put(filterKey, filterType)
    this.setState({commentFilter: filterType})
  }

  // Contrains, saves, and returns it (does not load more comments)
  setMaxComments (maxComments) {
    this.maxComments = constrainMaxComments(maxComments)
    put(maxCommentsKey, this.maxComments)
    return this.maxComments
  }

  // Loads more comments
  loadMoreComments = loadingMoreComments => this.setState({loadingMoreComments})

  setTheme (newTheme) {
    put(themeKey, newTheme)
    this.curTheme = newTheme
    document.documentElement.dataset.theme = newTheme
  }

  setSuccess = () => {
    this.setState({statusText: '', statusHelpUrl: undefined, statusImage: '/images/success.png'})
    document.body.classList.remove('wait')
  }
  setLoading = text => {
    this.setState({statusText: text, statusImage: '/images/loading.gif'})
    document.body.classList.add('wait')
  }
  setError = (error, helpUrl = undefined) => {
    this.setState({statusText: error.message, statusImage: '/images/error.png'})
    if (helpUrl)
      this.setState({statusHelpUrl: helpUrl})
    document.body.classList.remove('wait')
  }
  clearStatus = () => {
    this.setState({statusText: '', statusHelpUrl: undefined, statusImage: undefined})
    document.body.classList.remove('wait')
  }

  isErrored = () => this.state.statusImage?.endsWith('error.png')
}

// A redux-like connect function for Unstated
export const connect = Component => {
  return props => (
    <Subscribe to={[GlobalState]}>
      {globalState => <Component {...props} global={globalState} />}
    </Subscribe>
  )
}
