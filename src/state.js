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

export const maxCommentsDefault = 800
export const minCommentsLimit   = chunkSize
export const maxCommentsLimit   = 20000

// Contrains, saves, and returns it, but does not change the state (does not load more comments)
export const saveMaxComments = maxComments => {
  maxComments = Math.min(Math.round(maxComments), maxCommentsLimit)
  if (!(maxComments >= minCommentsLimit))  // also true when maxComments isn't a number
    maxComments = minCommentsLimit
  put(maxCommentsKey, maxComments)
  return maxComments
}

// Gets the saved setting, regardless of the current state
export const getMaxComments = () => get(maxCommentsKey, maxCommentsDefault)

// Keys for localStorage
const sortKey = 'commentSort'
const filterKey = 'commentFilter'
const maxCommentsKey = 'maxComments'

class GlobalState extends Container {
  state = {
    commentSort: get(sortKey, sort.top),
    commentFilter: get(filterKey, filter.removedDeleted),
    maxComments: get(maxCommentsKey, maxCommentsDefault),
    statusText: '',
    statusHelpUrl: undefined,
    statusImage: undefined
  }

  setCommentSort (sortType) {
    put(sortKey, sortType)
    this.setState({commentSort: sortType})
  }

  setCommentFilter (filterType) {
    put(filterKey, filterType)
    this.setState({commentFilter: filterType})
  }

  // Sets the current state based on the saved setting (loads more comments)
  loadMaxComments = () => this.setState({maxComments: getMaxComments()})

  // Sets the current state loading moreComments, ignoring the saved setting
  loadMoreComments = moreComments => this.setState({maxComments: this.state.maxComments + moreComments})

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
}

// A redux-like connect function for Unstated
export const connect = Component => {
  return props => (
    <Subscribe to={[GlobalState]}>
      {globalState => <Component {...props} global={globalState} />}
    </Subscribe>
  )
}
