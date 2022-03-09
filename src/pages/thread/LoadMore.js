import React from 'react'
import {connect, maxCommentsDefault} from '../../state'

let loadingStarted = false, showLoadedCount = false, lastTotal, newComments
const loadMoreComments = (props, maxComments) => {
  loadingStarted = true
  props.global.loadMoreComments(maxComments)
}

const loadMore = (props) => {
  const maxCommentsPreferred = props.global.maxComments
  let loadElements

  if (props.reloadingComments)
    loadElements = [<span key='loading'>loading...</span>]
  else {
    if (props.loadedAllComments)
      loadElements = [<a key='default' onClick={() => loadMoreComments(props, maxCommentsDefault)}>load new comments</a>]
    else {
      loadElements = []
      if (maxCommentsPreferred <= maxCommentsDefault / 2)
        loadElements.push(<a key='pref' onClick={() => loadMoreComments(props, maxCommentsPreferred)}>load {maxCommentsPreferred} more comments</a>)
      loadElements.push(<a key='default' onClick={() => loadMoreComments(props, maxCommentsDefault)}>load {maxCommentsDefault} more comments</a>)
      if (maxCommentsPreferred >= maxCommentsDefault * 2)
        loadElements.push(<a key='pref' onClick={() => loadMoreComments(props, maxCommentsPreferred)}>load {maxCommentsPreferred} more comments</a>)
    }
    if (loadingStarted) {
      showLoadedCount = true
      newComments = props.total - lastTotal
      lastTotal = props.total
      loadingStarted = false
    } else if (lastTotal !== props.total) {
      showLoadedCount = false
      lastTotal = props.total
    }
    if (showLoadedCount) {
      loadElements.push(<span key='loaded' className='fade'>
        {newComments > 0 ? `loaded ${newComments} more comments` : 'no new comments found'}
      </span>)
    }
  }
  return <p className='load-more'>{loadElements}</p>
}

export default connect(loadMore)
